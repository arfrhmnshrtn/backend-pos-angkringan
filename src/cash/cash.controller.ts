import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { CashService } from './cash.service.js';
import { CashFilterDto, TransactionFilterDto } from './dto/cash-filter.dto.js';
import {
  CreateBudgetAllocationDto,
  UpdateBudgetAllocationDto,
  CreateReconciliationDto,
} from './dto/cash.dto.js';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../common/constants/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';

@ApiTags('Cash & Finance Reports')
@ApiBearerAuth()
@Controller('cash')
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Get('reports')
  @Permissions(PERMISSIONS.CASH_REPORT_READ)
  @ApiOperation({
    summary: 'Mendapatkan laporan utama kas dan keuangan',
    description: `Mengembalikan laporan keuangan lengkap meliputi:
    
**PROFIT (Laba Rugi):**
- total_revenue: Omzet dari pesanan status LUNAS saja
- other_income: Pemasukan manual di luar pesanan POS
- total_gross_revenue: total_revenue + other_income
- total_cost: HPP dari snapshot harga_modal pada detail_pesanan
- gross_profit: total_gross_revenue - total_cost
- total_expense: Pengeluaran operasional (non-hutang)
- net_profit: gross_profit - total_expense
- profit_margin: (gross_profit / total_gross_revenue) × 100

**CASH FLOW (Arus Kas):**
- total_cash_in: Seluruh kas masuk (penjualan lunas + pembayaran hutang customer + pemasukan manual)
- total_cash_out: Seluruh kas keluar (pengeluaran + pembayaran hutang supplier)
- net_cash_flow: total_cash_in - total_cash_out

**PENTING:** net_profit ≠ net_cash_flow. Keduanya adalah konsep berbeda.

**Filter tanggal:**
- Penjualan: berdasarkan pesanan.created_at
- Pembayaran hutang: berdasarkan debt_payment.paid_at
- Expense: berdasarkan transaksi_keuangan.created_at`,
  })
  @ApiQuery({ name: 'period', required: false, enum: ['7days', '30days', 'month', 'year', 'custom'], description: 'Periode filter' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Tanggal awal (YYYY-MM-DD). Wajib jika period=custom', example: '2026-08-01' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Tanggal akhir (YYYY-MM-DD). Wajib jika period=custom', example: '2026-08-31' })
  @ApiResponse({
    status: 200,
    description: 'Laporan kas berhasil diambil',
    schema: {
      example: {
        success: true,
        message: 'Laporan kas berhasil diambil',
        data: {
          period: { type: 'month', start_date: '2026-08-01', end_date: '2026-08-31' },
          summary: {
            opening_balance: 0,
            total_cash_in: 150000,
            total_cash_out: 20000,
            net_cash_flow: 130000,
            closing_balance: 130000,
          },
          sales: {
            total_revenue: 120000,
            total_transactions: 2,
            total_items_sold: 6,
            average_transaction: 60000,
            cash_sales: 120000,
            credit_sales: 100000,
          },
          profit: {
            total_revenue: 120000,
            other_income: 150000,
            total_gross_revenue: 270000,
            total_cost: 70000,
            gross_profit: 200000,
            total_expense: 20000,
            net_profit: 180000,
            profit_margin: 74.07,
          },
          cash_flow: {
            total_cash_in: 150000,
            total_cash_out: 20000,
            net_cash_flow: 130000,
          },
          debt: {
            total_payment_received: 30000,
            total_payment_paid_to_supplier: 0,
            remaining_receivable: 160000,
            remaining_payable: 0,
          },
        },
      },
    },
  })
  getReports(@Query() query: CashFilterDto) {
    return this.cashService.getReports(query);
  }

  @Get('balance')
  @Permissions(PERMISSIONS.CASH_REPORT_READ)
  @ApiOperation({
    summary: 'Mendapatkan saldo kas saat ini per metode pembayaran',
  })
  getBalance(@Query() query: CashFilterDto) {
    return this.cashService.getBalance(query);
  }

  @Get('flow')
  @Permissions(PERMISSIONS.CASH_REPORT_READ)
  @ApiOperation({ summary: 'Mendapatkan arus kas (grafik trend harian)' })
  getCashFlow(@Query() query: CashFilterDto) {
    return this.cashService.getCashFlow(query);
  }

  @Get('transactions')
  @Permissions(PERMISSIONS.CASH_TRANSACTION_READ)
  @ApiOperation({ summary: 'Mendapatkan daftar seluruh transaksi kas' })
  getTransactions(@Query() query: TransactionFilterDto) {
    return this.cashService.getTransactions(query);
  }

  @Get('income-breakdown')
  @Permissions(PERMISSIONS.CASH_REPORT_READ)
  @ApiOperation({
    summary: 'Mendapatkan rincian kas masuk (berdasarkan sumber)',
  })
  getIncomeBreakdown(@Query() query: CashFilterDto) {
    return this.cashService.getIncomeBreakdown(query);
  }

  @Get('expense-breakdown')
  @Permissions(PERMISSIONS.CASH_REPORT_READ)
  @ApiOperation({
    summary: 'Mendapatkan rincian kas keluar (berdasarkan kategori)',
  })
  getExpenseBreakdown(@Query() query: CashFilterDto) {
    return this.cashService.getExpenseBreakdown(query);
  }

  @Get('budget')
  @Permissions(PERMISSIONS.CASH_BUDGET_READ)
  @ApiOperation({ summary: 'Mendapatkan daftar alokasi budget' })
  getBudgets() {
    return this.cashService.getBudgets();
  }

  @Post('budget')
  @Permissions(PERMISSIONS.CASH_BUDGET_CREATE)
  @ApiOperation({ summary: 'Membuat alokasi budget baru' })
  createBudget(
    @Body() createDto: CreateBudgetAllocationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.cashService.createBudget(createDto, user.id);
  }

  @Patch('budget/:id')
  @Permissions(PERMISSIONS.CASH_BUDGET_UPDATE)
  @ApiOperation({ summary: 'Mengupdate alokasi budget' })
  updateBudget(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateBudgetAllocationDto,
  ) {
    return this.cashService.updateBudget(id, updateDto);
  }

  @Delete('budget/:id')
  @Permissions(PERMISSIONS.CASH_BUDGET_DELETE)
  @ApiOperation({ summary: 'Menghapus alokasi budget' })
  deleteBudget(@Param('id', ParseIntPipe) id: number) {
    return this.cashService.deleteBudget(id);
  }

  @Post('reconciliation')
  @Permissions(PERMISSIONS.CASH_RECONCILIATION_CREATE)
  @ApiOperation({
    summary: 'Mencatat rekonsiliasi selisih kas fisik vs sistem',
  })
  createReconciliation(
    @Body() createDto: CreateReconciliationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.cashService.createReconciliation(createDto, user.id);
  }
}
