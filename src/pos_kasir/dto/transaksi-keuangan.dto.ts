import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { jenis_transaksi, metode_pembayaran } from '@prisma/client';

export class CreateTransaksiKeuanganDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  readonly id_kategori!: number;

  @ApiProperty({ example: 50000 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  readonly nominal!: number;

  @ApiPropertyOptional({ enum: metode_pembayaran })
  @IsEnum(metode_pembayaran)
  @IsOptional()
  readonly metode_pembayaran?: metode_pembayaran;

  @ApiProperty({ example: 'Keterangan transaksi' })
  @IsString()
  @IsNotEmpty()
  readonly keterangan!: string;
}

export class GetTransaksiFilterDto {
  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  readonly page?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  readonly limit?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  readonly search?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  readonly sort?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  readonly order?: 'asc' | 'desc';

  @ApiPropertyOptional({ enum: jenis_transaksi })
  @IsEnum(jenis_transaksi)
  @IsOptional()
  readonly jenis?: jenis_transaksi;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  readonly id_kategori?: number;
}
