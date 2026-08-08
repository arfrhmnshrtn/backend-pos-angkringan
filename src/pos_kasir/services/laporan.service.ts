import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { LaporanFilterDto } from '../dto/laporan.dto.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class LaporanService {
  private readonly logger = new Logger(LaporanService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getReport(tipe: 'harian' | 'mingguan' | 'bulanan' | 'tahunan', filter: LaporanFilterDto) {
    const whereCondition: Prisma.transaksi_keuanganWhereInput = {};

    let startDate: Date;
    let endDate: Date = new Date();

    if (filter.start_date && filter.end_date) {
      startDate = new Date(filter.start_date);
      endDate = new Date(filter.end_date);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Automatic range based on type if no user input
      const today = new Date();
      startDate = new Date(today);
      if (tipe === 'harian') {
        startDate.setHours(0, 0, 0, 0);
      } else if (tipe === 'mingguan') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (tipe === 'bulanan') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (tipe === 'tahunan') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }
    }

    whereCondition.created_at = {
      gte: startDate,
      lte: endDate,
    };

    if (filter.id_kategori) {
      whereCondition.id_kategori = filter.id_kategori;
    }

    if (filter.jenis) {
      whereCondition.jenis = filter.jenis;
    }

    const [transaksiList, aggregateTransaksi] = await Promise.all([
      this.prisma.transaksi_keuangan.findMany({
        where: whereCondition,
        orderBy: { created_at: 'desc' },
        include: { kategori: true },
      }),
      this.prisma.transaksi_keuangan.groupBy({
        by: ['jenis'],
        where: whereCondition,
        _sum: { nominal: true },
      })
    ]);

    let totalPemasukan = 0;
    let totalPengeluaran = 0;

    aggregateTransaksi.forEach(agg => {
      if (agg.jenis === 'pemasukan') totalPemasukan = agg._sum.nominal || 0;
      if (agg.jenis === 'pengeluaran') totalPengeluaran = agg._sum.nominal || 0;
    });

    const labaBersih = totalPemasukan - totalPengeluaran;

    return {
      success: true,
      message: `Laporan ${tipe} berhasil di-generate`,
      data: {
        filter: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          id_kategori: filter.id_kategori || null,
          jenis: filter.jenis || null,
        },
        summary: {
          total_pemasukan: totalPemasukan,
          total_pengeluaran: totalPengeluaran,
          laba_bersih: labaBersih,
        },
        transaksi: transaksiList,
      }
    };
  }
}
