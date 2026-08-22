import { IsOptional, IsString, IsEnum, ValidateIf, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { metode_pembayaran, jenis_transaksi } from '@prisma/client';

export class CashFilterDto {
  @ApiPropertyOptional({ description: 'Filter periode', enum: ['7days', '30days', 'month', 'year', 'custom'] })
  @IsOptional()
  @IsString()
  period?: '7days' | '30days' | 'month' | 'year' | 'custom';

  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)' })
  @ValidateIf((o) => o.period === 'custom' || o.endDate)
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)' })
  @ValidateIf((o) => o.period === 'custom' || o.startDate)
  @IsString()
  endDate?: string;
}

export class TransactionFilterDto extends CashFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['CASH_IN', 'CASH_OUT'] })
  @IsOptional()
  @IsString()
  type?: 'CASH_IN' | 'CASH_OUT';

  @ApiPropertyOptional({ enum: metode_pembayaran })
  @IsOptional()
  @IsEnum(metode_pembayaran)
  payment_method?: metode_pembayaran;

  @ApiPropertyOptional({ description: 'POS | DEBT_PAYMENT | INCOME | EXPENSE | OTHER' })
  @IsOptional()
  @IsString()
  source_type?: string;
}
