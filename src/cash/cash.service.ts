import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CashFilterDto, TransactionFilterDto } from './dto/cash-filter.dto.js';
import { CreateBudgetAllocationDto, UpdateBudgetAllocationDto, CreateReconciliationDto } from './dto/cash.dto.js';
import { metode_pembayaran } from '@prisma/client';
import { generatePagination, getPaginationParams } from '../pos_kasir/helpers/pagination.helper.js';

const calculatePages = (total: number, limit: number) => Math.ceil(total / (limit || 1));

@Injectable()
export class CashService {
  private readonly logger = new Logger(CashService.name);

  constructor(private readonly prisma: PrismaService) {}

  private getDateRange(query: CashFilterDto): { startDate: Date; endDate: Date } {
    const period = query.period || 'month';
    let startDate = new Date();
    let endDate = new Date();

    if (period === 'custom' && query.startDate && query.endDate) {
      startDate = new Date(query.startDate);
      endDate = new Date(query.endDate);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }

    endDate.setHours(23, 59, 59, 999);

    if (period === '7days') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === '30days') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (period === 'year') {
      startDate = new Date(new Date().getFullYear(), 0, 1);
    } else {
      // Default: 'month' (current month)
      startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    }
    
    startDate.setHours(0, 0, 0, 0);

    return { startDate, endDate };
  }

  private async calculateAggregatedBalances(startDate: Date, endDate: Date) {
    const initialConfigBalances = await this.prisma.cash_balance.groupBy({
      by: ['payment_method'],
      _sum: { amount: true },
      where: { effective_date: { lte: endDate } }
    });

    const initMap = { tunai: 0, qris: 0, transfer: 0 };
    initialConfigBalances.forEach(b => {
       if (b.payment_method) initMap[b.payment_method] += b._sum.amount || 0;
    });

    const pastTransactions = await this.prisma.transaksi_keuangan.groupBy({
      by: ['metode_pembayaran', 'jenis'],
      where: { created_at: { lt: startDate } },
      _sum: { nominal: true }
    });

    const periodTransactions = await this.prisma.transaksi_keuangan.groupBy({
      by: ['metode_pembayaran', 'jenis'],
      where: { created_at: { gte: startDate, lte: endDate } },
      _sum: { nominal: true }
    });

    const methods = ['tunai', 'qris', 'transfer'] as const;
    const payment_methods: any = {};
    const summary = {
      opening_balance: 0,
      total_cash_in: 0,
      total_cash_out: 0,
      net_cash_flow: 0,
      closing_balance: 0
    };

    methods.forEach(method => {
       let opening = initMap[method];
       
       const pastIn = pastTransactions.find(t => t.metode_pembayaran === method && t.jenis === 'pemasukan')?._sum.nominal || 0;
       const pastOut = pastTransactions.find(t => t.metode_pembayaran === method && t.jenis === 'pengeluaran')?._sum.nominal || 0;
       
       opening += (pastIn - pastOut);

       const cash_in = periodTransactions.find(t => t.metode_pembayaran === method && t.jenis === 'pemasukan')?._sum.nominal || 0;
       const cash_out = periodTransactions.find(t => t.metode_pembayaran === method && t.jenis === 'pengeluaran')?._sum.nominal || 0;
       const closing_balance = opening + cash_in - cash_out;

       payment_methods[method] = {
         opening_balance: opening,
         cash_in,
         cash_out,
         closing_balance
       };

       summary.opening_balance += opening;
       summary.total_cash_in += cash_in;
       summary.total_cash_out += cash_out;
       summary.closing_balance += closing_balance;
    });

    summary.net_cash_flow = summary.total_cash_in - summary.total_cash_out;
    return { payment_methods, summary };
  }

  async getReports(query: CashFilterDto) {
    const { startDate, endDate } = this.getDateRange(query);
    const { summary, payment_methods } = await this.calculateAggregatedBalances(startDate, endDate);

    // Sales metrics
    const salesAgg = await this.prisma.pesanan.aggregate({
      where: { created_at: { gte: startDate, lte: endDate }, status: { in: ['lunas', 'hutang'] } },
      _sum: { total_harga: true }
    });

    const cashSalesAgg = await this.prisma.pesanan.aggregate({
      where: { created_at: { gte: startDate, lte: endDate }, status: 'lunas' },
      _sum: { total_harga: true }
    });

    const total_revenue = salesAgg._sum.total_harga || 0;
    const cash_sales = cashSalesAgg._sum.total_harga || 0;
    const credit_sales = Math.max(0, total_revenue - cash_sales);

    // Debt metrics
    const debtPayAgg = await this.prisma.debt_payment.aggregate({
      where: { paid_at: { gte: startDate, lte: endDate } },
      _sum: { amount: true }
    });

    const debtRemAgg = await this.prisma.debt.aggregate({
      where: { status: { notIn: ['LUNAS', 'DIBATALKAN'] } },
      _sum: { remaining_amount: true }
    });

    // Gross and Net Profit Logic
    const pesananDetail = await this.prisma.detail_pesanan.findMany({
      where: { pesanan: { created_at: { gte: startDate, lte: endDate }, status: { in: ['lunas', 'hutang'] } } },
      include: { menu: { select: { harga_modal: true } } }
    });
    
    let total_cogs = 0;
    pesananDetail.forEach(d => { total_cogs += (d.menu?.harga_modal || 0) * d.jumlah; });
    
    const gross_profit = total_revenue - total_cogs;
    
    const expenseKategori = await this.prisma.kategori_keuangan.findMany({ where: { jenis: 'pengeluaran' } });
    const expenseIds = expenseKategori.map(k => k.id);
    const expenseAgg = await this.prisma.transaksi_keuangan.aggregate({
      where: { created_at: { gte: startDate, lte: endDate }, id_kategori: { in: expenseIds } },
      _sum: { nominal: true }
    });
    const true_expenses = expenseAgg._sum.nominal || 0;
    const net_profit = gross_profit - true_expenses;

    // Budget Configuration
    const activeBudgets = await this.prisma.budget_allocation.findMany({ where: { is_active: true } });
    let total_percentage = 0;
    const allocations = activeBudgets.map(b => {
      total_percentage += b.percentage;
      return {
        name: b.name,
        percentage: b.percentage,
        amount: Math.round(summary.closing_balance * (b.percentage / 100))
      };
    });

    const remaining_percentage = Math.max(0, 100 - total_percentage);
    const remaining_amount = Math.round(summary.closing_balance * (remaining_percentage / 100));

    return {
      success: true,
      message: 'Laporan kas berhasil diambil',
      data: {
        period: { type: query.period || 'month', start_date: startDate.toISOString().split('T')[0], end_date: endDate.toISOString().split('T')[0] },
        summary,
        payment_methods,
        sales: { total_revenue, cash_sales, credit_sales },
        debt: { total_payment_received: debtPayAgg._sum.amount || 0, remaining_receivable: debtRemAgg._sum.remaining_amount || 0 },
        profit: { gross_profit, net_profit },
        budget: { allocations, total_percentage, remaining_percentage, remaining_amount }
      }
    };
  }

  async getBalance(query: CashFilterDto) {
    const { startDate, endDate } = this.getDateRange(query);
    const { summary, payment_methods } = await this.calculateAggregatedBalances(startDate, endDate);

    return {
      success: true,
      message: 'Saldo kas berhasil diambil',
      data: {
        total: summary.closing_balance,
        methods: { tunai: payment_methods.tunai.closing_balance, qris: payment_methods.qris.closing_balance, transfer: payment_methods.transfer.closing_balance }
      }
    };
  }

  async getCashFlow(query: CashFilterDto) {
    const { startDate, endDate } = this.getDateRange(query);
    const transactions = await this.prisma.transaksi_keuangan.findMany({
      where: { created_at: { gte: startDate, lte: endDate } },
      select: { nominal: true, jenis: true, created_at: true }
    });

    const flowMap = new Map();
    transactions.forEach(t => {
      const dateStr = new Date(t.created_at).toISOString().split('T')[0];
      if (!flowMap.has(dateStr)) flowMap.set(dateStr, { date: dateStr, cash_in: 0, cash_out: 0, net_cash_flow: 0 });
      const entry = flowMap.get(dateStr);
      if (t.jenis === 'pemasukan') entry.cash_in += t.nominal;
      else if (t.jenis === 'pengeluaran') entry.cash_out += t.nominal;
      entry.net_cash_flow = entry.cash_in - entry.cash_out;
    });

    const sortedFlow = Array.from(flowMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return { success: true, message: 'Arus kas berhasil diambil', data: sortedFlow };
  }

  async getTransactions(query: TransactionFilterDto) {
    const { page = 1, limit = 20, type, payment_method, search, source_type } = query;
    const { startDate, endDate } = this.getDateRange(query);
    
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = { created_at: { gte: startDate, lte: endDate } };
    if (type) where.jenis = type === 'CASH_IN' ? 'pemasukan' : 'pengeluaran';
    if (payment_method) where.metode_pembayaran = payment_method;
    if (search) {
      where.OR = [ { keterangan: { contains: search, mode: 'insensitive' } }, { nomor_transaksi: { contains: search, mode: 'insensitive' } } ];
    }
    if (source_type) {
       if (source_type === 'POS') { where.id_pesanan = { not: null }; where.debt_payment = { is: null }; }
       else if (source_type === 'DEBT_PAYMENT') { where.debt_payment = { isNot: null }; }
       else if (source_type === 'INCOME') { where.jenis = 'pemasukan'; where.id_pesanan = null; where.debt_payment = { is: null }; }
       else if (source_type === 'EXPENSE') { where.jenis = 'pengeluaran'; where.id_pesanan = null; where.debt_payment = { is: null }; }
    }

    const [total, txs] = await Promise.all([
      this.prisma.transaksi_keuangan.count({ where }),
      this.prisma.transaksi_keuangan.findMany({
        where, skip, take, orderBy: { created_at: 'desc' },
        include: { user: { select: { id: true, fullname: true } }, pesanan: { select: { nomor_pesanan: true } }, debt_payment: { select: { id: true } } }
      })
    ]);

    const formattedData = txs.map(t => {
       let dynamic_source = 'OTHER', source_id = null;
       if (t.debt_payment) { dynamic_source = 'DEBT_PAYMENT'; source_id = t.debt_payment.id; }
       else if (t.id_pesanan) { dynamic_source = 'POS'; source_id = t.id_pesanan; }
       else if (t.jenis === 'pemasukan') { dynamic_source = 'INCOME'; source_id = t.id_kategori; }
       else if (t.jenis === 'pengeluaran') { dynamic_source = 'EXPENSE'; source_id = t.id_kategori; }

       return {
         id: t.id, type: t.jenis === 'pemasukan' ? 'CASH_IN' : 'CASH_OUT', source_type: dynamic_source, source_id,
         description: t.keterangan || (t.pesanan ? `Transaksi POS ${t.pesanan.nomor_pesanan}` : 'Transaksi Internal'),
         payment_method: (t.metode_pembayaran || 'tunai').toUpperCase(), amount: t.nominal,
         transaction_date: t.created_at, created_by: t.id_user, user: t.user
       };
    });

    return {
      success: true, message: 'Transaksi kas berhasil diambil', data: formattedData,
      pagination: { page: Number(page), limit: Number(limit), total, total_pages: calculatePages(total, take) }
    };
  }

  async getIncomeBreakdown(query: CashFilterDto) {
    const { startDate, endDate } = this.getDateRange(query);
    const incomes = await this.prisma.transaksi_keuangan.findMany({
      where: { jenis: 'pemasukan', created_at: { gte: startDate, lte: endDate } },
      include: { debt_payment: true }
    });

    let pos = 0, debt_payment = 0, manual_income = 0;
    incomes.forEach(t => {
      if (t.debt_payment) debt_payment += t.nominal;
      else if (t.id_pesanan) pos += t.nominal;
      else manual_income += t.nominal;
    });

    return { success: true, message: 'Rincian pemasukan berhasil diambil', data: { pos, debt_payment, manual_income } };
  }

  async getExpenseBreakdown(query: CashFilterDto) {
    const { startDate, endDate } = this.getDateRange(query);
    const expenses = await this.prisma.transaksi_keuangan.groupBy({
      by: ['id_kategori'], where: { jenis: 'pengeluaran', created_at: { gte: startDate, lte: endDate } }, _sum: { nominal: true }
    });

    const kategories = await this.prisma.kategori_keuangan.findMany({ where: { jenis: 'pengeluaran' } });
    const katMap = new Map();
    kategories.forEach(k => katMap.set(k.id, k.nama));

    const formattedData = expenses.map(e => ({ category: katMap.get(e.id_kategori) || 'LAINNYA', total_amount: e._sum.nominal || 0 }));
    formattedData.sort((a, b) => b.total_amount - a.total_amount);

    return { success: true, message: 'Rincian pengeluaran berhasil diambil', data: formattedData };
  }

  async getBudgets() {
    const budgets = await this.prisma.budget_allocation.findMany({
      orderBy: { created_at: 'desc' }, include: { user: { select: { id: true, fullname: true } } }
    });
    return { success: true, message: 'Data budget berhasil diambil', data: budgets };
  }

  async createBudget(createDto: CreateBudgetAllocationDto, userId: number) {
    const currentBudgets = await this.prisma.budget_allocation.findMany({ where: { is_active: true } });
    const totalPercentageReq = currentBudgets.reduce((acc, curr) => acc + curr.percentage, 0) + createDto.percentage;

    if (totalPercentageReq > 100) throw new BadRequestException('Total alokasi budget tidak boleh melebihi 100%.');

    const budget = await this.prisma.budget_allocation.create({ data: { ...createDto, created_by: userId } });
    return { success: true, message: 'Alokasi budget berhasil dibuat', data: budget };
  }

  async updateBudget(id: number, updateDto: UpdateBudgetAllocationDto) {
    const budgetRaw = await this.prisma.budget_allocation.findUnique({ where: { id } });
    if (!budgetRaw) throw new NotFoundException('Budget tidak ditemukan');

    if (updateDto.percentage !== undefined) {
       const currentBudgets = await this.prisma.budget_allocation.findMany({ where: { is_active: true, id: { not: id } } });
       const totalPercentage = currentBudgets.reduce((acc, curr) => acc + curr.percentage, 0) + updateDto.percentage;
       if (totalPercentage > 100) throw new BadRequestException('Total alokasi budget tidak boleh melebihi 100%.');
    }

    const budget = await this.prisma.budget_allocation.update({ where: { id }, data: updateDto });
    return { success: true, message: 'Alokasi budget berhasil diperbarui', data: budget };
  }

  async deleteBudget(id: number) {
     const budget = await this.prisma.budget_allocation.findUnique({ where: { id } });
     if (!budget) throw new NotFoundException('Budget tidak ditemukan');
     await this.prisma.budget_allocation.delete({ where: { id } });
     return { success: true, message: 'Alokasi budget berhasil dihapus', data: null };
  }

  async createReconciliation(createDto: CreateReconciliationDto, userId: number) {
     const { payment_methods } = await this.calculateAggregatedBalances(new Date(1970,0,1), new Date());
     const methodId = createDto.payment_method.toLowerCase();
     const systemAmount = payment_methods[methodId]?.closing_balance || 0;
     const difference = createDto.actual_amount - systemAmount;

     if (difference !== 0) {
       let kategori = await this.prisma.kategori_keuangan.findUnique({ where: { nama: 'Rekonsiliasi Kas' } });
       if (!kategori) kategori = await this.prisma.kategori_keuangan.create({ data: { nama: 'Rekonsiliasi Kas', jenis: difference > 0 ? 'pemasukan' : 'pengeluaran' } });

       const timestampStr = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
       await this.prisma.transaksi_keuangan.create({
         data: {
           nomor_transaksi: `REC-${timestampStr}`,
           jenis: difference > 0 ? 'pemasukan' : 'pengeluaran',
           id_kategori: kategori.id,
           nominal: Math.abs(difference),
           metode_pembayaran: createDto.payment_method,
           keterangan: createDto.note || `Koreksi Rekonsiliasi (Sistem: ${systemAmount}, Fisik: ${createDto.actual_amount})`,
           id_user: userId
         }
       });
     }

     return { success: true, message: 'Rekonsiliasi berhasil diproses. Selisih telah disesuaikan.', data: { system_amount: systemAmount, actual_amount: createDto.actual_amount, difference } };
  }
}
