import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { CashService } from './cash.service.js';
import { CashFilterDto, TransactionFilterDto } from './dto/cash-filter.dto.js';
import { CreateBudgetAllocationDto, UpdateBudgetAllocationDto, CreateReconciliationDto } from './dto/cash.dto.js';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Mendapatkan laporan utama kas dan keuangan' })
  getReports(@Query() query: CashFilterDto) {
    return this.cashService.getReports(query);
  }

  @Get('balance')
  @Permissions(PERMISSIONS.CASH_REPORT_READ)
  @ApiOperation({ summary: 'Mendapatkan saldo kas saat ini per metode pembayaran' })
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
  @ApiOperation({ summary: 'Mendapatkan rincian kas masuk (berdasarkan sumber)' })
  getIncomeBreakdown(@Query() query: CashFilterDto) {
    return this.cashService.getIncomeBreakdown(query);
  }

  @Get('expense-breakdown')
  @Permissions(PERMISSIONS.CASH_REPORT_READ)
  @ApiOperation({ summary: 'Mendapatkan rincian kas keluar (berdasarkan kategori)' })
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
  createBudget(@Body() createDto: CreateBudgetAllocationDto, @CurrentUser() user: JwtPayload) {
    return this.cashService.createBudget(createDto, user.id);
  }

  @Patch('budget/:id')
  @Permissions(PERMISSIONS.CASH_BUDGET_UPDATE)
  @ApiOperation({ summary: 'Mengupdate alokasi budget' })
  updateBudget(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateBudgetAllocationDto) {
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
  @ApiOperation({ summary: 'Mencatat rekonsiliasi selisih kas fisik vs sistem' })
  createReconciliation(@Body() createDto: CreateReconciliationDto, @CurrentUser() user: JwtPayload) {
    return this.cashService.createReconciliation(createDto, user.id);
  }
}
