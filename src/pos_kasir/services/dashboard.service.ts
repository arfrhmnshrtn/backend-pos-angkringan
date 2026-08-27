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

    // Helper to calculate profit for a given date range
    const getProfitMetrics = async (startDate: Date | undefined) => {
      // 1. Revenue (POS Lunas)
      const validOrders = await this.prisma.pesanan.findMany({
        where: {
          status: 'lunas',
          ...(startDate ? { created_at: { gte: startDate } } : {})
        },
        include: { detail_pesanan: { include: { menu: { select: { harga_modal: true } } } } }
      });

      let posRevenue = 0;
      let costHPP = 0;
      validOrders.forEach(order => {
        posRevenue += order.total_harga;
        order.detail_pesanan.forEach(item => {
          const modal = (item.harga_modal && item.harga_modal > 0) ? item.harga_modal : (item.menu?.harga_modal || 0);
          costHPP += modal * item.jumlah;
        });
      });

      // 2. Other Income (Manual Pemasukan, EXCLUDE Debt & POS)
      const otherIncomeAgg = await this.prisma.transaksi_keuangan.aggregate({
        where: {
          jenis: 'pemasukan',
          id_pesanan: null,
          debt_payment: { is: null },
          ...(startDate ? { created_at: { gte: startDate } } : {})
        },
        _sum: { nominal: true },
      });
      const otherIncome = otherIncomeAgg._sum.nominal || 0;
      const totalIncome = posRevenue + otherIncome;

      // 3. Operational Expenses (Manual Pengeluaran, EXCLUDE Debt)
      // Check for debt categories just in case
      const debtCategories = await this.prisma.kategori_keuangan.findMany({
        where: { jenis: 'pengeluaran', nama: { in: ['Pembayaran Utang', 'Pembayaran Piutang'] } }
      });
      const debtCatIds = debtCategories.map(c => c.id);

      const opsExpenseAgg = await this.prisma.transaksi_keuangan.aggregate({
        where: {
          jenis: 'pengeluaran',
          debt_payment: { is: null },
          ...(debtCatIds.length > 0 ? { id_kategori: { notIn: debtCatIds } } : {}),
          ...(startDate ? { created_at: { gte: startDate } } : {})
        },
        _sum: { nominal: true },
      });
      const opsExpense = opsExpenseAgg._sum.nominal || 0;

      const labaBersih = totalIncome - costHPP - opsExpense;

      return { totalIncome, opsExpense, labaBersih };
    };

    const profitHariIni = await getProfitMetrics(today);
    const profitBulanIni = await getProfitMetrics(firstDayOfMonth);
    const profitSemuaWaktu = await getProfitMetrics(undefined);

    const totalMenu = await this.prisma.katalog_menu.count();
    const totalSemuaPesanan = await this.prisma.pesanan.count();
    
    // Debt summary
    const allDebtsSum = await this.prisma.debt.aggregate({
      where: { status: { not: 'LUNAS' } },
      _sum: { remaining_amount: true }
    });
    const totalHutangAktif = allDebtsSum._sum.remaining_amount || 0;

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

    // 2.1 Chart Revenue & HPP
    const chartOrders = await this.prisma.pesanan.findMany({
      where: {
        status: 'lunas',
        created_at: { gte: sevenDaysAgo }
      },
      include: { detail_pesanan: { include: { menu: { select: { harga_modal: true } } } } }
    });

    chartOrders.forEach(order => {
      const trxDate = order.created_at.toISOString().split('T')[0];
      const match = grafikList.find(g => g.date === trxDate);
      if (match) {
        match.pemasukan += order.total_harga;
        let orderCost = 0;
        order.detail_pesanan.forEach(item => {
          const modal = (item.harga_modal && item.harga_modal > 0) ? item.harga_modal : (item.menu?.harga_modal || 0);
          orderCost += modal * item.jumlah;
        });
        match.pengeluaran += orderCost; // Temporarily add HPP to pengeluaran field
      }
    });

    // 2.2 Chart Other Income & Ops Expense
    const debtCategoriesForChart = await this.prisma.kategori_keuangan.findMany({
      where: { jenis: 'pengeluaran', nama: { in: ['Pembayaran Utang', 'Pembayaran Piutang'] } }
    });
    const debtCatChartIds = debtCategoriesForChart.map(c => c.id);

    const chartOps = await this.prisma.transaksi_keuangan.findMany({
      where: { 
        created_at: { gte: sevenDaysAgo },
        debt_payment: { is: null }
      },
    });

    chartOps.forEach(trx => {
      const trxDate = trx.created_at.toISOString().split('T')[0];
      const match = grafikList.find(g => g.date === trxDate);
      if (match) {
        if (trx.jenis === 'pemasukan' && !trx.id_pesanan) {
          match.pemasukan += trx.nominal;
        } else if (trx.jenis === 'pengeluaran') {
          if (!debtCatChartIds.includes(trx.id_kategori)) {
            match.pengeluaran += trx.nominal; 
          }
        }
      }
    });

    // Subtotal final
    grafikList.forEach(g => {
       g.laba = g.pemasukan - g.pengeluaran;
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
            pemasukan: profitHariIni.totalIncome,
            pengeluaran: profitHariIni.opsExpense,
            laba: profitHariIni.labaBersih,
            pesanan: {
              total: countPesananToday,
              belum_bayar: pesananBelumBayar,
              lunas: pesananLunas,
              hutang: pesananHutang,
            }
          },
          bulan_ini: {
            pemasukan: profitBulanIni.totalIncome,
            pengeluaran: profitBulanIni.opsExpense,
            laba: profitBulanIni.labaBersih,
          },
          semua_waktu: {
            pemasukan: profitSemuaWaktu.totalIncome,
            pengeluaran: profitSemuaWaktu.opsExpense,
            laba: profitSemuaWaktu.labaBersih,
            total_pesanan: totalSemuaPesanan,
            total_menu: totalMenu,
            hutang_aktif: totalHutangAktif
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
