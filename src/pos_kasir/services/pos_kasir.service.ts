import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { generatePesananNumber } from '../helpers/pesanan-number.generator.js';
import {
  generatePagination,
  getPaginationParams,
} from '../helpers/pagination.helper.js';
import {
  CreatePesananDto,
  UpdatePembayaranDto,
  GetPesananFilterDto,
} from '../dto/pesanan.dto.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class PosKasirService {
  private readonly logger = new Logger(PosKasirService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createOrder(createDto: CreatePesananDto) {
    const { items, nama_pelanggan } = createDto;

    return this.prisma.$transaction(async (tx) => {
      let total_item = 0;
      let total_harga = 0;
      const detail_pesanan_data = [];

      for (const item of items) {
        const menu = await tx.katalog_menu.findUnique({
          where: { id: item.id_menu },
        });

        if (!menu) {
          throw new NotFoundException(
            `Menu dengan ID ${item.id_menu} tidak ditemukan`,
          );
        }

        if (menu.stok < item.jumlah) {
          throw new BadRequestException(
            `Stok menu ${menu.nama_item} tidak mencukupi (Sisa stok: ${menu.stok})`,
          );
        }

        const subtotal = menu.harga_jual * item.jumlah;

        detail_pesanan_data.push({
          id_menu: menu.id,
          nama_menu: menu.nama_item,
          harga: menu.harga_jual,
          jumlah: item.jumlah,
          subtotal,
        });

        total_item += item.jumlah;
        total_harga += subtotal;

        // Kurangi stok
        await tx.katalog_menu.update({
          where: { id: menu.id },
          data: { stok: menu.stok - item.jumlah },
        });
      }

      const nomor_pesanan = await generatePesananNumber(this.prisma);

      const pesanan = await tx.pesanan.create({
        data: {
          nomor_pesanan,
          nama_pelanggan: nama_pelanggan || null,
          total_item,
          total_harga,
          detail_pesanan: {
            create: detail_pesanan_data,
          },
        },
        include: {
          detail_pesanan: true,
        },
      });

      return {
        success: true,
        message: 'Pesanan berhasil dibuat',
        data: pesanan,
      };
    });
  }

  async findAllOrders(filter: GetPesananFilterDto) {
    const { skip, take, page, limit } = getPaginationParams(
      filter.page,
      filter.limit,
    );
    const where: Prisma.pesananWhereInput = {};

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.search) {
      where.OR = [
        { nomor_pesanan: { contains: filter.search, mode: 'insensitive' } },
        { nama_pelanggan: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const sortField = filter.sort || 'created_at';
    const sortOrder = filter.order || 'desc';

    const [data, total] = await Promise.all([
      this.prisma.pesanan.findMany({
        where,
        skip,
        take,
        orderBy: { [sortField]: sortOrder },
        include: { detail_pesanan: { include: { menu: true } } },
      }),
      this.prisma.pesanan.count({ where }),
    ]);

    return {
      success: true,
      message: 'Daftar pesanan berhasil diambil',
      ...generatePagination(data, total, page, limit),
    };
  }

  async findOneOrder(id: number) {
    const pesanan = await this.prisma.pesanan.findUnique({
      where: { id },
      include: {
        detail_pesanan: true,
      },
    });

    if (!pesanan) {
      throw new NotFoundException('Pesanan tidak ditemukan');
    }

    return {
      success: true,
      message: 'Detail pesanan berhasil diambil',
      data: pesanan,
    };
  }

  async updatePembayaran(
    id: number,
    updateDto: UpdatePembayaranDto,
    userId: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const pesanan = await tx.pesanan.findUnique({ where: { id } });

      if (!pesanan) {
        throw new NotFoundException('Pesanan tidak ditemukan');
      }

      if (pesanan.status === 'lunas') {
        throw new BadRequestException(
          'Pesanan sudah lunas, tidak dapat diubah',
        );
      }

      const updatedPesanan = await tx.pesanan.update({
        where: { id },
        data: {
          status: updateDto.status,
          metode_pembayaran:
            updateDto.metode_pembayaran || pesanan.metode_pembayaran,
        },
      });

      if (updateDto.status === 'lunas') {
        if (!updateDto.metode_pembayaran && !pesanan.metode_pembayaran) {
          throw new BadRequestException(
            'Metode pembayaran wajib diisi saat status lunas',
          );
        }

        // Cari Kategori 'Penjualan POS'
        let kategori = await tx.kategori_keuangan.findUnique({
          where: { nama: 'Penjualan' },
        });

        if (!kategori) {
          // Buat otomatis jika belum ada untuk menghindari error
          kategori = await tx.kategori_keuangan.create({
            data: {
              nama: 'Penjualan',
              jenis: 'pemasukan',
            },
          });
        }

        // Cek dan update debt jika ada
        const existDebt = await tx.debt.findUnique({
          where: { id_pesanan: id },
        });

        if (
          existDebt &&
          existDebt.status !== 'LUNAS' &&
          existDebt.status !== 'DIBATALKAN'
        ) {
          const sisaPembayaran = existDebt.remaining_amount;

          await tx.debt.update({
            where: { id: existDebt.id },
            data: {
              paid_amount: existDebt.total_amount,
              remaining_amount: 0,
              status: 'LUNAS',
            },
          });

          if (sisaPembayaran > 0) {
            const date = new Date();
            const uniqueSuffix = Math.floor(Math.random() * 10000)
              .toString()
              .padStart(4, '0');
            const nomor_transaksi = `TRX-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${uniqueSuffix}`;

            const newTransaksi = await tx.transaksi_keuangan.create({
              data: {
                nomor_transaksi,
                jenis: 'pemasukan',
                id_kategori: kategori.id,
                nominal: sisaPembayaran,
                metode_pembayaran:
                  updateDto.metode_pembayaran ||
                  pesanan.metode_pembayaran ||
                  'tunai',
                keterangan: `Pelunasan Pesanan Hutang ${pesanan.nomor_pesanan}`,
                id_pesanan: pesanan.id,
                id_user: userId,
              },
            });

            await tx.debt_payment.create({
              data: {
                id_debt: existDebt.id,
                amount: sisaPembayaran,
                payment_method:
                  updateDto.metode_pembayaran ||
                  pesanan.metode_pembayaran ||
                  'tunai',
                id_user: userId,
                id_transaksi_keuangan: newTransaksi.id,
              },
            });
          }
        } else {
          const existTransaksi = await tx.transaksi_keuangan.findFirst({
            where: { id_pesanan: id },
          });

          if (!existTransaksi) {
            await tx.transaksi_keuangan.create({
              data: {
                nomor_transaksi: pesanan.nomor_pesanan,
                jenis: 'pemasukan',
                id_kategori: kategori.id,
                nominal: pesanan.total_harga,
                metode_pembayaran:
                  updateDto.metode_pembayaran || pesanan.metode_pembayaran,
                keterangan: `Pembayaran Pesanan ${pesanan.nomor_pesanan}`,
                id_pesanan: pesanan.id,
                id_user: userId,
              },
            });
          }
        }
      } else if (updateDto.status === 'hutang') {
        const existDebt = await tx.debt.findUnique({
          where: { id_pesanan: id },
        });

        if (!existDebt) {
          await tx.debt.create({
            data: {
              type: 'CUSTOMER',
              customer_name:
                pesanan.nama_pelanggan ||
                `Pelanggan POS ${pesanan.nomor_pesanan}`,
              note: 'Otomatis dari transaksi POS',
              total_amount: pesanan.total_harga,
              paid_amount: 0,
              remaining_amount: pesanan.total_harga,
              status: 'BELUM_LUNAS',
              id_pesanan: pesanan.id,
              created_by: userId,
            },
          });
        }
      }

      return {
        success: true,
        message: 'Pembayaran pesanan berhasil diperbarui',
        data: updatedPesanan,
      };
    });
  }

  async deleteOrder(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const pesanan = await tx.pesanan.findUnique({
        where: { id },
        include: { detail_pesanan: true },
      });

      if (!pesanan) {
        throw new NotFoundException('Pesanan tidak ditemukan');
      }

      if (pesanan.status === 'lunas') {
        throw new BadRequestException(
          'Pesanan yang sudah lunas tidak dapat dihapus',
        );
      }

      // Kembalikan Stok
      for (const detail of pesanan.detail_pesanan) {
        await tx.katalog_menu.update({
          where: { id: detail.id_menu },
          data: {
            stok: { increment: detail.jumlah },
          },
        });
      }

      // Hapus Detail Pesanan and Pesanan (Cascade / Manual)
      await tx.detail_pesanan.deleteMany({
        where: { id_pesanan: id },
      });

      await tx.pesanan.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Pesanan berhasil dihapus dan stok telah dikembalikan',
        data: null,
      };
    });
  }
}
