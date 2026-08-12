import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { DebtService } from '../services/debt.service.js';
import {
  CreateDebtDto,
  UpdateDebtDto,
  CreateDebtPaymentDto,
  GetDebtsFilterDto,
  ConvertTransactionDto,
} from '../dto/debt.dto.js';
import { Permissions } from '../../auth/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/index.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../auth/guards/permissions.guard.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Debt')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('debts')
export class DebtController {
  constructor(private readonly debtService: DebtService) {}

  @Post()
  @Permissions(PERMISSIONS.DEBT_CREATE)
  @ApiOperation({ summary: 'Create manual debt' })
  create(@Body() createDto: CreateDebtDto, @CurrentUser() user: any) {
    return this.debtService.createDebt(createDto, user.id);
  }

  @Get()
  @Permissions(PERMISSIONS.DEBT_READ)
  @ApiOperation({ summary: 'Get all debts with pagination and filter' })
  findAll(@Query() filter: GetDebtsFilterDto) {
    return this.debtService.findAll(filter);
  }

  @Get('summary')
  @Permissions(PERMISSIONS.DEBT_READ)
  @ApiOperation({ summary: 'Get debt summary statistics' })
  getSummary() {
    return this.debtService.getSummary();
  }

  @Get(':id')
  @Permissions(PERMISSIONS.DEBT_READ)
  @ApiOperation({ summary: 'Get debt by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.debtService.findOne(id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.DEBT_UPDATE)
  @ApiOperation({ summary: 'Update debt details' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateDebtDto,
  ) {
    return this.debtService.updateDebt(id, updateDto);
  }

  @Post(':id/cancel')
  @Permissions(PERMISSIONS.DEBT_CANCEL)
  @ApiOperation({ summary: 'Cancel a debt' })
  cancelDebt(@Param('id', ParseIntPipe) id: number) {
    return this.debtService.cancelDebt(id);
  }

  @Post(':id/payments')
  @Permissions(PERMISSIONS.DEBT_PAYMENT)
  @ApiOperation({ summary: 'Record a debt payment' })
  createPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() paymentDto: CreateDebtPaymentDto,
    @CurrentUser() user: any,
  ) {
    return this.debtService.createPayment(id, paymentDto, user.id);
  }

  @Get(':id/payments')
  @Permissions(PERMISSIONS.DEBT_READ)
  @ApiOperation({ summary: 'Get payment history for a debt' })
  getPayments(@Param('id', ParseIntPipe) id: number) {
    return this.debtService.getPayments(id);
  }

  @Post('from-transaction/:transactionId')
  @Permissions(PERMISSIONS.DEBT_CREATE)
  @ApiOperation({ summary: 'Convert POS transaction to debt' })
  convertTransaction(
    @Param('transactionId', ParseIntPipe) transactionId: number,
    @Body() convertDto: ConvertTransactionDto,
    @CurrentUser() user: any,
  ) {
    return this.debtService.convertTransactionToDebt(
      transactionId,
      convertDto,
      user.id,
    );
  }
}
