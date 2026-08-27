import {
  IsString,
  IsInt,
  IsNotEmpty,
  IsEnum,
  Min,
  Max,
  IsNumber,
  IsBoolean,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { metode_pembayaran } from '@prisma/client';

export class CreateBudgetAllocationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'PERCENTAGE or FIXED', enum: ['PERCENTAGE', 'FIXED'], default: 'PERCENTAGE' })
  @IsOptional()
  @IsString()
  allocation_type?: 'PERCENTAGE' | 'FIXED';

  @ApiPropertyOptional({ description: 'Percentage 0-100 (required when allocation_type is PERCENTAGE)' })
  @ValidateIf((o) => !o.allocation_type || o.allocation_type === 'PERCENTAGE')
  @IsInt()
  @Min(0)
  @Max(100)
  percentage?: number;

  @ApiPropertyOptional({ description: 'Fixed amount in IDR (required when allocation_type is FIXED)' })
  @ValidateIf((o) => o.allocation_type === 'FIXED')
  @IsInt()
  @Min(0)
  fixed_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateBudgetAllocationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'PERCENTAGE or FIXED', enum: ['PERCENTAGE', 'FIXED'] })
  @IsOptional()
  @IsString()
  allocation_type?: 'PERCENTAGE' | 'FIXED';

  @ApiPropertyOptional({ description: 'Percentage 0-100' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  percentage?: number;

  @ApiPropertyOptional({ description: 'Fixed amount in IDR' })
  @IsOptional()
  @IsInt()
  @Min(0)
  fixed_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateReconciliationDto {
  @ApiProperty({ enum: metode_pembayaran })
  @IsEnum(metode_pembayaran)
  payment_method: metode_pembayaran;

  @ApiProperty({ description: 'Actual amount observed in physical cash/bank' })
  @IsInt()
  actual_amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
