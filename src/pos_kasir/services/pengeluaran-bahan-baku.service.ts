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
    const total_price = Math.round(createDto.total_price);
    const unit_price = Math.round(total_price / createDto.quantity);
    const kategori = await this.getOrCreateKategoriBahanBaku();

    // Check for existing by case-insensitive name match
    const existingList = await this.prisma.pengeluaran_bahan_baku.findMany({
      where: {
        nama_item: {
          equals: createDto.item_name,
          mode: 'insensitive',
        }
      }
    });

    const existing = existingList.find(e => e.satuan.toLowerCase() === createDto.unit.trim().toLowerCase());
    const existingDiffUnit = existingList.find(e => e.satuan.toLowerCase() !== createDto.unit.trim().toLowerCase());

    if (!existing && existingDiffUnit) {
       throw new BadRequestException('Item sudah terdaftar dengan satuan berbeda.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const nomor_transaksi = await generateTransaksiNumber(tx as any);

      // Selalu catat sebagai histori transaksi keuangan baru (Cash Flow)
      const transaksi = await tx.transaksi_keuangan.create({
        data: {
          nomor_transaksi,
          jenis: 'pengeluaran',
          id_kategori: kategori.id,
          nominal: total_price,
          metode_pembayaran: 'tunai', 
          keterangan: createDto.note || `Pembelian bahan baku: ${createDto.item_name} ${createDto.quantity} ${createDto.unit}`,
          id_user: userId,
        },
      });

      let updatedBahanBaku;
      if (existing) {
         // UPSERT: update existing record with accumulated quantity
         const newQuantity = existing.jumlah + createDto.quantity;
         const newTotalHarga = existing.total_harga + total_price;
         // Rata-rata harga satuan
         const newHargaSatuan = Math.round(newTotalHarga / newQuantity);

         updatedBahanBaku = await tx.pengeluaran_bahan_baku.update({
            where: { id: existing.id },
            data: {
               jumlah: newQuantity,
               total_harga: newTotalHarga,
               harga_satuan: newHargaSatuan,
               catatan: createDto.note,
               id_transaksi_keuangan: transaksi.id,
               updated_at: new Date(),
            }
         });
      } else {
         // CREATE new stock record
         updatedBahanBaku = await tx.pengeluaran_bahan_baku.create({
            data: {
              nama_item: createDto.item_name,
              jumlah: createDto.quantity,
              satuan: createDto.unit,
              harga_satuan: unit_price,
              total_harga: total_price,
              catatan: createDto.note,
              created_by: userId,
              id_transaksi_keuangan: transaksi.id,
            }
         });
      }

      return updatedBahanBaku;
    });

    return {
      success: true,
      message: existing ? 'Pengeluaran bahan baku berhasil diperbarui' : 'Pengeluaran bahan baku berhasil ditambahkan',
      data: result,
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
      orderBy: { updated_at: 'desc' },
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

    // Hanya menggunakan kuantitas input untuk menggantikan kuantitas lama
    const quantity = updateDto.quantity !== undefined ? updateDto.quantity : existing.jumlah;
    const total_price = updateDto.total_price !== undefined ? Math.round(updateDto.total_price) : existing.total_harga;
    const unit_price = Math.round(total_price / quantity);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedBahanBaku = await tx.pengeluaran_bahan_baku.update({
        where: { id },
        data: {
          nama_item: updateDto.item_name,
          jumlah: quantity, // Langsung direplace agar tidak akumulasi ganda
          satuan: updateDto.unit,
          harga_satuan: unit_price,
          total_harga: total_price,
          catatan: updateDto.note,
        },
      });

      // Kita amankan history dengan TIDAK menimpa nominal transaksi_keuangan yang terkait,
      // karena total_price sekarang merepresentasikan total akumulatif inventori stoknya!
      if (updateDto.note !== undefined && existing.transaksi_keuangan) {
          await tx.transaksi_keuangan.update({
              where: { id: existing.id_transaksi_keuangan },
              data: { keterangan: updateDto.note }
          });
      }

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

    // Kita hanya hapus bahan bakunya dan biarkan history transaksi pengeluarannya tetap ada
    await this.prisma.pengeluaran_bahan_baku.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Data pengeluaran bahan baku berhasil dihapus',
    };
  }
}
