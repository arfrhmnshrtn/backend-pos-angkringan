import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SalesAnalysisQueryDto, AnalysisPeriod } from './dto/sales-analysis-query.dto.js';
import { SalesAnalysisResponseDto, PeriodDto } from './dto/sales-analysis-response.dto.js';

@Injectable()
export class AnalysisService {
  constructor(private prisma: PrismaService) {}

  // --- Date Utilities ---

  private getWibTodayString(date: Date = new Date()): string {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    return `${year}-${month}-${day}`;
  }

  private adjustDays(dateStr: string, days: number): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    // Use 12:00 UTC to safely add/subtract days and avoid daylight saving or leap second issues
    const date = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
    return date.toISOString().split('T')[0];
  }

  private getMonthBounds(dateStr: string): { start: string; end: string } {
    const [y, m] = dateStr.split('-').map(Number);
    const startObj = new Date(Date.UTC(y, m - 1, 1, 12, 0, 0));
    const endObj = new Date(Date.UTC(y, m, 0, 12, 0, 0)); // Day 0 of next month is last day of current month
    return {
      start: startObj.toISOString().split('T')[0],
      end: endObj.toISOString().split('T')[0],
    };
  }

  private getYearBounds(dateStr: string): { start: string; end: string } {
    const [y] = dateStr.split('-').map(Number);
    const startObj = new Date(Date.UTC(y, 0, 1, 12, 0, 0));
    const endObj = new Date(Date.UTC(y, 11, 31, 12, 0, 0));
    return {
      start: startObj.toISOString().split('T')[0],
      end: endObj.toISOString().split('T')[0],
    };
  }

  private parseWibDateToUTC(dateStr: string, isEnd: boolean = false): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (isEnd) {
      return new Date(Date.UTC(year, month - 1, day, 16, 59, 59, 999));
    } else {
      return new Date(Date.UTC(year, month - 1, day, -7, 0, 0, 0));
    }
  }

  private calculatePeriodBounds(query: SalesAnalysisQueryDto): PeriodDto {
    const todayStr = this.getWibTodayString();
    let startDate: string;
    let endDate: string;
    const periodType = query.period || AnalysisPeriod.LAST_30_DAYS;

    switch (periodType) {
      case AnalysisPeriod.TODAY:
        startDate = todayStr;
        endDate = todayStr;
        break;
      case AnalysisPeriod.LAST_7_DAYS:
        startDate = this.adjustDays(todayStr  , -6);
        endDate = todayStr;
        break;
      case AnalysisPeriod.LAST_30_DAYS:
        startDate = this.adjustDays(todayStr, -29);
        endDate = todayStr;
        break;
      case AnalysisPeriod.MONTH:
        const monthBounds = this.getMonthBounds(todayStr);
        startDate = monthBounds.start;
        endDate = monthBounds.end;
        break;
      case AnalysisPeriod.YEAR:
        const yearBounds = this.getYearBounds(todayStr);
        startDate = yearBounds.start;
        endDate = yearBounds.end;
        break;
      case AnalysisPeriod.CUSTOM:
        if (!query.startDate || !query.endDate) {
          throw new BadRequestException('startDate and endDate are required for custom period');
        }
        startDate = query.startDate;
        endDate = query.endDate;
        if (startDate > endDate) {
          throw new BadRequestException('startDate must be before or equal to endDate');
        }
        break;
      default:
        startDate = this.adjustDays(todayStr, -29);
        endDate = todayStr;
        break;
    }

    return { type: periodType, start_date: startDate, end_date: endDate };
  }

  // --- Main Logic ---

  async getSalesAnalysis(query: SalesAnalysisQueryDto): Promise<SalesAnalysisResponseDto> {
    const period = this.calculatePeriodBounds(query);
    const startUtc = this.parseWibDateToUTC(period.start_date, false);
    const endUtc = this.parseWibDateToUTC(period.end_date, true);

    // 1. Fetch valid orders (LUNAS)
    // We only count orders that are fully paid
    const validOrders = await this.prisma.pesanan.findMany({
      where: {
        status: 'lunas',
        created_at: {
          gte: startUtc,
          lte: endUtc,
        },
      },
      include: {
        detail_pesanan: {
          // We include menu to get harga_modal from it
          include: { menu: true },
        },
      },
    });

    // 2. Fetch expenses from transaksi_keuangan
    const expenseSum = await this.prisma.transaksi_keuangan.aggregate({
      where: {
        jenis: 'pengeluaran',
        created_at: {
          gte: startUtc,
          lte: endUtc,
        },
      },
      _sum: { nominal: true },
    });
    const totalExpense = expenseSum._sum.nominal || 0;

    // 3. Fetch debts created and paid in this period
    const totalDebtObj = await this.prisma.debt.aggregate({
      where: { created_at: { gte: startUtc, lte: endUtc } },
      _sum: { total_amount: true, remaining_amount: true },
    });
    const totalDebtPaidObj = await this.prisma.debt_payment.aggregate({
      where: { paid_at: { gte: startUtc, lte: endUtc } },
      _sum: { amount: true },
    });

    // --- Aggregating Data ---

    let totalRevenue = 0;
    let totalItemsSold = 0;
    let totalCost = 0;
    const transactionsCount = validOrders.length;
    const paymentMethods = {
      tunai: { transaction_count: 0, total_amount: 0 },
      qris: { transaction_count: 0, total_amount: 0 },
      transfer: { transaction_count: 0, total_amount: 0 },
    };
    const productStats = new Map<
      number,
      { id: number; name: string; category: string; quantity: number; revenue: number; cost: number; profit: number }
    >();
    const chartDataMap = new Map<string, { transaction_count: number; revenue: number }>();

    for (const order of validOrders) {
      if (!order.metode_pembayaran) continue; // safety check

      // update payment methods
      const method = order.metode_pembayaran;
      if (paymentMethods[method]) {
        paymentMethods[method].transaction_count += 1;
        paymentMethods[method].total_amount += order.total_harga;
      }

      // revenue from order total? yes, or sum up details? 
      // Safe to use order.total_harga assuming it includes any discounts, but we will aggregate items
      totalRevenue += order.total_harga;

      // Group chart by date (WIB localized string based on order.created_at)
      // Since order is in UTC, we convert to local string
      const orderDateStr = this.getWibTodayString(order.created_at);
      // for "year" period, we could group by month, but the prompt says:
      // "Untuk year lebih baik gunakan agregasi per bulan."
      let chartKey = orderDateStr;
      if (period.type === AnalysisPeriod.YEAR) {
        chartKey = orderDateStr.substring(0, 7); // YYYY-MM
      }
      if (!chartDataMap.has(chartKey)) {
        chartDataMap.set(chartKey, { transaction_count: 0, revenue: 0 });
      }
      chartDataMap.get(chartKey)!.transaction_count += 1;
      chartDataMap.get(chartKey)!.revenue += order.total_harga;

      // aggregate details
      for (const item of order.detail_pesanan) {
        totalItemsSold += item.jumlah;

        // harga modal uses current katalog_menu modal because it's not snapshotted
        // If not found (deleted? unlikely), defaults to 0
        const modal = item.menu?.harga_modal || 0;
        const itemCost = modal * item.jumlah;
        const itemRevenue = item.subtotal; // Using subtotal for accurate individual revenue
        const itemProfit = itemRevenue - itemCost;
        totalCost += itemCost;

        const prodId = item.id_menu;
        if (!productStats.has(prodId)) {
          productStats.set(prodId, {
            id: prodId,
            name: item.nama_menu,
            category: item.menu?.kategori || 'unknown',
            quantity: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
          });
        }
        const ps = productStats.get(prodId)!;
        ps.quantity += item.jumlah;
        ps.revenue += itemRevenue;
        ps.cost += itemCost;
        ps.profit += itemProfit;
      }
    }

    const grossProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const averageTransaction = transactionsCount > 0 ? Math.floor(totalRevenue / transactionsCount) : 0;
    const netProfit = grossProfit - totalExpense;

    // Build chart array
    const chartKeys = Array.from(chartDataMap.keys()).sort();
    const salesChart = chartKeys.map((key) => ({
      date: key,
      transaction_count: chartDataMap.get(key)!.transaction_count,
      revenue: chartDataMap.get(key)!.revenue,
    }));

    // Build top products
    const topProducts = Array.from(productStats.values())
      .sort((a, b) => b.quantity - a.quantity)
      .map((p, idx) => ({
        ranking: idx + 1,
        ...p,
      }));

    return {
      period,
      summary: {
        total_revenue: totalRevenue,
        total_transactions: transactionsCount,
        total_items_sold: totalItemsSold,
        average_transaction: averageTransaction,
        total_cost: totalCost,
        gross_profit: grossProfit,
        profit_margin: Number(profitMargin.toFixed(2)),
        total_expense: totalExpense,
        net_profit: netProfit,
      },
      sales_chart: salesChart,
      top_products: topProducts,
      payment_methods: paymentMethods,
      debt_summary: {
        total_debt: totalDebtObj._sum.total_amount || 0,
        total_paid: totalDebtPaidObj._sum.amount || 0,
        total_remaining: totalDebtObj._sum.remaining_amount || 0,
      },
    };
  }
}
