import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { metode_pembayaran, status_pesanan } from '@prisma/client';

export class CreatePesananItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  readonly id_menu!: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  readonly jumlah!: number;
}

export class CreatePesananDto {
  @ApiPropertyOptional({ example: 'Pelanggan POS' })
  @IsString()
  @IsOptional()
  readonly nama_pelanggan?: string;

  @ApiProperty({ type: [CreatePesananItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePesananItemDto)
  @IsNotEmpty()
  readonly items!: CreatePesananItemDto[];
}

export class UpdatePembayaranDto {
  @ApiProperty({ enum: status_pesanan })
  @IsEnum(status_pesanan)
  @IsNotEmpty()
  readonly status!: status_pesanan;

  @ApiPropertyOptional({ enum: metode_pembayaran })
  @IsEnum(metode_pembayaran)
  @IsOptional()
  readonly metode_pembayaran?: metode_pembayaran;
}

export class GetPesananFilterDto {
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

  @ApiPropertyOptional({ enum: status_pesanan })
  @IsEnum(status_pesanan)
  @IsOptional()
  readonly status?: status_pesanan;
}
