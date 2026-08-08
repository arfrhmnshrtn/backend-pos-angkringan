import { IsString, IsNotEmpty, IsNumber, IsEnum, IsUrl, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { kategori } from '@prisma/client';

export class CreateKatalogDto {
  @IsString()
  @IsNotEmpty()
  nama_item: string;

  @IsEnum(kategori)
  kategori: kategori;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stok: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  harga_modal: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  harga_jual: number;

  @IsOptional()
  @IsString()
  url_gambar: string;
}
