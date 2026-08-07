import { kategori } from '@prisma/client';

export class CreateKatalogDto {
  nama_item: string;
  kategori: kategori;
  stok: number;
  harga_modal: number;
  harga_jual: number;
  url_gambar: string;
}
