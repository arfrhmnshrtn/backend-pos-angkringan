import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { jenis_transaksi } from '@prisma/client';

export class CreateKategoriKeuanganDto {
  @ApiProperty({ example: 'Operasional' })
  @IsString()
  @IsNotEmpty()
  readonly nama!: string;

  @ApiProperty({ enum: jenis_transaksi })
  @IsEnum(jenis_transaksi)
  @IsNotEmpty()
  readonly jenis!: jenis_transaksi;
}

export class UpdateKategoriKeuanganDto {
  @ApiPropertyOptional({ example: 'Operasional Baru' })
  @IsString()
  @IsNotEmpty()
  readonly nama!: string;

  @ApiPropertyOptional({ enum: jenis_transaksi })
  @IsEnum(jenis_transaksi)
  @IsNotEmpty()
  readonly jenis!: jenis_transaksi;
}
