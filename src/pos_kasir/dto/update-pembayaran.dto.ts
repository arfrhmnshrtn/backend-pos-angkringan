import { IsEnum, IsNotEmpty } from 'class-validator';
import { metode_pembayaran, status_pesanan } from '@prisma/client';

export class UpdatePembayaranDto {
  @IsNotEmpty()
  @IsEnum(metode_pembayaran)
  metode_pembayaran: metode_pembayaran;

  @IsNotEmpty()
  @IsEnum(status_pesanan)
  status: status_pesanan;
}
