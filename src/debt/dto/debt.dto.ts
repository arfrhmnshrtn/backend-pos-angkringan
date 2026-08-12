import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { debt_type, debt_status, metode_pembayaran } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateDebtDto {
  @ApiProperty({ enum: debt_type })
  @IsEnum(debt_type)
  @IsNotEmpty()
  type: debt_type;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  customer_name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  supplier_name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  @Type(() => Number)
  total_amount: number;
}

export class UpdateDebtDto {
  @ApiPropertyOptional({ enum: debt_type })
  @IsEnum(debt_type)
  @IsOptional()
  type?: debt_type;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  customer_name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  supplier_name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;
}

export class CreateDebtPaymentDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  @Type(() => Number)
  amount: number;

  @ApiProperty({ enum: metode_pembayaran })
  @IsEnum(metode_pembayaran)
  @IsNotEmpty()
  payment_method: metode_pembayaran;
}

export class GetDebtsFilterDto {
  @ApiPropertyOptional({ enum: debt_type })
  @IsEnum(debt_type)
  @IsOptional()
  type?: debt_type;

  @ApiPropertyOptional({ enum: debt_status })
  @IsEnum(debt_status)
  @IsOptional()
  status?: debt_status;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 10;
}

export class ConvertTransactionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  customer_name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  initial_payment_amount?: number;

  @ApiPropertyOptional({ enum: metode_pembayaran })
  @IsEnum(metode_pembayaran)
  @IsOptional()
  payment_method?: metode_pembayaran;
}

