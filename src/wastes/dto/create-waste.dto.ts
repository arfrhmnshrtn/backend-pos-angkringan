import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { waste_type, waste_reason } from '@prisma/client';

export class CreateWasteDto {
  @ApiProperty({ enum: waste_type, description: 'Jenis barang (PRODUCT atau INGREDIENT)' })
  @IsEnum(waste_type)
  @IsNotEmpty()
  type: waste_type;

  @ApiProperty({ description: 'ID barang (Katalog Menu untuk PRODUCT, Ingredient untuk INGREDIENT)' })
  @IsInt()
  @IsNotEmpty()
  item_id: number;

  @ApiProperty({ description: 'Jumlah barang terbuang' })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({ enum: waste_reason, description: 'Alasan barang terbuang' })
  @IsEnum(waste_reason)
  @IsNotEmpty()
  reason: waste_reason;

  @ApiPropertyOptional({ description: 'Catatan (Wajib jika alasan = LAINNYA)' })
  @ValidateIf((o) => o.reason === waste_reason.LAINNYA)
  @IsNotEmpty()
  @IsString()
  note?: string;
}
