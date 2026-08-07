import { IsInt, IsOptional, IsString, Min, ValidateNested, ArrayMinSize, IsArray, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePesananItemDto {
  @IsInt()
  @Min(1)
  id_menu: number;

  @IsInt()
  @Min(1)
  jumlah: number;
}

export class CreatePesananDto {
  @IsOptional()
  @IsString()
  nama_pelanggan?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePesananItemDto)
  items: CreatePesananItemDto[];
}
