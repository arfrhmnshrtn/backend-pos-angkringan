import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // =====================================
    // 1. Ringkasan
    // =====================================

    // Harian
    const aggregateDailyTransaksi = await this.prisma.transaksi_keuangan.groupBy({
      by: ['jenis'],
      where: { created_at: { gte: today } },
      _sum: { nominal: true },
    });
    
    let pemasukanHariIni = 0;
    let pengeluaranHariIni = 0;
    aggregateDailyTransaksi.forEach(agg => {
      if (agg.jenis === 'pemasukan') pemasukanHariIni = agg._sum.nominal || 0;
      if (agg.jenis === 'pengeluaran') pengeluaranHariIni = agg._sum.nominal || 0;
    });

    // Bulanan
    const aggregateMonthlyTransaksi = await this.prisma.transaksi_keuangan.groupBy({
      by: ['jenis'],
      where: { created_at: { gte: firstDayOfMonth } },
      _sum: { nominal: true },
    });

    let pemasukanBulanIni = 0;
    let pengeluaranBulanIni = 0;

    aggregateMonthlyTransaksi.forEach(agg => {
      if (agg.jenis === 'pemasukan') pemasukanBulanIni = agg._sum.nominal || 0;
      if (agg.jenis === 'pengeluaran') pengeluaranBulanIni = agg._sum.nominal || 0;
    });

    // Jumlah Pesanan
    const countPesananToday = await this.prisma.pesanan.count({
      where: { created_at: { gte: today } }
    });

    const aggregatePesananStatus = await this.prisma.pesanan.groupBy({
      by: ['status'],
      where: { created_at: { gte: today } },
      _count: { status: true },
    });

    let pesananBelumBayar = 0;
    let pesananLunas = 0;
    let pesananHutang = 0;

    aggregatePesananStatus.forEach(agg => {
      if (agg.status === 'belum_bayar') pesananBelumBayar = agg._count.status;
      if (agg.status === 'lunas') pesananLunas = agg._count.status;
      if (agg.status === 'hutang') pesananHutang = agg._count.status;
    });

    // =====================================
    // 2. Grafik 7 Hari
    // =====================================
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0,0,0,0);

    const rsTransaksi7Days = await this.prisma.transaksi_keuangan.findMany({
      where: { created_at: { gte: sevenDaysAgo } },
      select: { created_at: true, jenis: true, nominal: true }
    });

    // Initialize labels
    const grafikList = [];
    const dateWalker = new Date(sevenDaysAgo);
    while (dateWalker <= today) {
      grafikList.push({
        date: dateWalker.toISOString().split('T')[0],
        pemasukan: 0,
        pengeluaran: 0,
        laba: 0,
      });
      dateWalker.setDate(dateWalker.getDate() + 1);
    }

    rsTransaksi7Days.forEach(trx => {
      const trxDate = trx.created_at.toISOString().split('T')[0];
      const match = grafikList.find(g => g.date === trxDate);
      if (match) {
        if (trx.jenis === 'pemasukan') match.pemasukan += trx.nominal;
        if (trx.jenis === 'pengeluaran') match.pengeluaran += trx.nominal;
        match.laba = match.pemasukan - match.pengeluaran;
      }
    });

    // =====================================
    // 3. Top 10 Menu Terlaris (Bulan ini)
    // =====================================
    const topMenusAgg = await this.prisma.detail_pesanan.groupBy({
      by: ['id_menu', 'nama_menu'],
      where: { created_at: { gte: firstDayOfMonth } },
      _sum: { jumlah: true },
      orderBy: { _sum: { jumlah: 'desc' } },
      take: 10,
    });

    const topMenus = topMenusAgg.map(agg => ({
      id_menu: agg.id_menu,
      nama_menu: agg.nama_menu,
      total_terjual: agg._sum.jumlah || 0,
    }));

    // =====================================
    // 4. Transaksi Terbaru (10 entries)
    // =====================================
    const transaksiTerbaru = await this.prisma.transaksi_keuangan.findMany({
      orderBy: { created_at: 'desc' },
      take: 10,
      include: {
        kategori: true,
      }
    });

    // =====================================
    // 5. Pesanan Terbaru (10 entries)
    // =====================================
    const pesananTerbaru = await this.prisma.pesanan.findMany({
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    return {
      success: true,
      message: 'Dashboard data retrieved',
      data: {
        ringkasan: {
          hari_ini: {
            pemasukan: pemasukanHariIni,
            pengeluaran: pengeluaranHariIni,
            laba: pemasukanHariIni - pengeluaranHariIni,
            pesanan: {
              total: countPesananToday,
              belum_bayar: pesananBelumBayar,
              lunas: pesananLunas,
              hutang: pesananHutang,
            }
          },
          bulan_ini: {
            pemasukan: pemasukanBulanIni,
            pengeluaran: pengeluaranBulanIni,
            laba: pemasukanBulanIni - pengeluaranBulanIni,
          }
        },
        grafik_7_hari: grafikList,
        top_menus: topMenus,
        transaksi_terbaru: transaksiTerbaru,
        pesanan_terbaru: pesananTerbaru,
      }
    };
  }
}
