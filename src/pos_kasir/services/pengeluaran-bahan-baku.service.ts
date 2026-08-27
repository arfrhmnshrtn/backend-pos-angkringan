import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { generateTransaksiNumber } from '../helpers/transaksi-number.generator.js';
import { CreatePengeluaranBahanBakuDto, UpdatePengeluaranBahanBakuDto, GetPengeluaranBahanBakuFilterDto } from '../dto/pengeluaran-bahan-baku.dto.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class PengeluaranBahanBakuService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreateKategoriBahanBaku() {
    let kategori = await this.prisma.kategori_keuangan.findFirst({
      where: { nama: 'Bahan Baku', jenis: 'pengeluaran' },
    });
    if (!kategori) {
      kategori = await this.prisma.kategori_keuangan.create({
        data: {
          nama: 'Bahan Baku',
          jenis: 'pengeluaran',
        },
      });
    }
    return kategori;
  }

  async create(createDto: CreatePengeluaranBahanBakuDto, userId: number) {
    const total_price = Math.round(createDto.quantity * createDto.unit_price);
    const kategori = await this.getOrCreateKategoriBahanBaku();

    // Use transaction to ensure expense and detail are consistent
    const result = await this.prisma.$transaction(async (tx) => {
      const nomor_transaksi = await generateTransaksiNumber(tx as any);

      const transaksi = await tx.transaksi_keuangan.create({
        data: {
          nomor_transaksi,
          jenis: 'pengeluaran',
          id_kategori: kategori.id,
          nominal: total_price,
          metode_pembayaran: 'tunai', // Default to tunai, or can be null if not needed immediately
          keterangan: createDto.note || `Pembelian bahan baku: ${createDto.item_name}`,
          id_user: userId,
          pengeluaran_bahan_baku: {
            create: {
              nama_item: createDto.item_name,
              jumlah: createDto.quantity,
              satuan: createDto.unit,
              harga_satuan: Math.round(createDto.unit_price),
              total_harga: total_price,
              catatan: createDto.note,
              created_by: userId,
            },
          },
        },
        include: {
          pengeluaran_bahan_baku: true,
        },
      });

      return transaksi;
    });

    return {
      success: true,
      message: 'Pengeluaran bahan baku berhasil dibuat',
      data: result.pengeluaran_bahan_baku,
    };
  }

  async findAll(filter: GetPengeluaranBahanBakuFilterDto) {
    const where: Prisma.pengeluaran_bahan_bakuWhereInput = {};

    if (filter.startDate && filter.endDate) {
      where.tanggal = {
        gte: new Date(filter.startDate),
        lte: new Date(filter.endDate + 'T23:59:59.999Z'),
      };
    }

    const data = await this.prisma.pengeluaran_bahan_baku.findMany({
      where,
      orderBy: { tanggal: 'desc' },
      include: {
        transaksi_keuangan: {
          select: { id: true, metode_pembayaran: true }
        }
      }
    });

    const total_material_expense = data.reduce((sum, item) => sum + item.total_harga, 0);

    return {
      success: true,
      message: 'Data pengeluaran bahan baku berhasil diambil',
      data: {
        summary: {
          total_material_expense,
          total_purchase_transactions: data.length,
          items: data.length, // total items recorded
        },
        items: data,
      },
    };
  }

  async update(id: number, updateDto: UpdatePengeluaranBahanBakuDto) {
    const existing = await this.prisma.pengeluaran_bahan_baku.findUnique({
      where: { id },
      include: { transaksi_keuangan: true },
    });

    if (!existing) {
      throw new NotFoundException('Data pengeluaran bahan baku tidak ditemukan');
    }

    // calculate new total
    const quantity = updateDto.quantity !== undefined ? updateDto.quantity : existing.jumlah;
    const unit_price = updateDto.unit_price !== undefined ? updateDto.unit_price : existing.harga_satuan;
    const total_price = Math.round(quantity * unit_price);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedBahanBaku = await tx.pengeluaran_bahan_baku.update({
        where: { id },
        data: {
          nama_item: updateDto.item_name,
          jumlah: updateDto.quantity,
          satuan: updateDto.unit,
          harga_satuan: updateDto.unit_price ? Math.round(updateDto.unit_price) : undefined,
          total_harga: total_price,
          catatan: updateDto.note,
        },
      });

      // Update nominal at expense
      await tx.transaksi_keuangan.update({
        where: { id: existing.id_transaksi_keuangan },
        data: {
          nominal: total_price,
          keterangan: updateDto.note !== undefined ? updateDto.note : existing.transaksi_keuangan.keterangan,
        },
      });

      return updatedBahanBaku;
    });

    return {
      success: true,
      message: 'Data pengeluaran bahan baku berhasil diperbarui',
      data: result,
    };
  }

  async remove(id: number) {
    const existing = await this.prisma.pengeluaran_bahan_baku.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Data pengeluaran bahan baku tidak ditemukan');
    }

    // Deleting the transaksi_keuangan will also cascade delete the pengeluaran_bahan_baku
    // as we added `onDelete: Cascade` in prisma schema.
    await this.prisma.transaksi_keuangan.delete({
      where: { id: existing.id_transaksi_keuangan },
    });

    return {
      success: true,
      message: 'Data pengeluaran bahan baku berhasil dihapus',
    };
  }
}
