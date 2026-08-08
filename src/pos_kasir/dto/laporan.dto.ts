import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { jenis_transaksi } from '@prisma/client';

export class LaporanFilterDto {
  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsDateString()
  @IsOptional()
  readonly start_date?: string;

  @ApiPropertyOptional({ example: '2026-08-31' })
  @IsDateString()
  @IsOptional()
  readonly end_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  readonly id_kategori?: number;

  @ApiPropertyOptional({ enum: jenis_transaksi })
  @IsEnum(jenis_transaksi)
  @IsOptional()
  readonly jenis?: jenis_transaksi;
}
