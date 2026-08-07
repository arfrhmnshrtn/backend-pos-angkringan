import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePesananDto, CreatePesananItemDto } from './dto/create-pesanan.dto';
import { UpdatePembayaranDto } from './dto/update-pembayaran.dto';
import { GetPesananFilterDto } from './dto/get-pesanan-filter.dto';
import { generateNomorPesanan } from './helpers/pesanan-number.generator';
import { PaginatedResult } from './types/pagination.type';
import { pesanan, detail_pesanan, Prisma } from '@prisma/client';

@Injectable()
export class PosKasirService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(
    data: CreatePesananDto,
  ): Promise<pesanan & { detail_pesanan: detail_pesanan[] }> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Group items by id_menu to avoid duplicates
      const groupedItems = this.groupItems(data.items);

      // 2. Fetch all related menus
      const menuIds = Array.from(groupedItems.keys());
      const menus = await tx.katalog_menu.findMany({
        where: { id: { in: menuIds } },
      });

      if (menus.length !== menuIds.length) {
        throw new BadRequestException('Beberapa menu tidak ditemukan di katalog.');
      }

      // 3. Process items and calculate totals
      let total_item: number = 0;
      let total_harga: number = 0;
      const detailPesananData: Prisma.detail_pesananCreateWithoutPesananInput[] = [];

      for (const menu of menus) {
        const jumlah = groupedItems.get(menu.id) || 0;

        if (menu.stok < jumlah) {
          throw new BadRequestException(
            `Stok menu ${menu.nama_item} tidak mencukupi. Sisa stok: ${menu.stok}`,
          );
        }

        // Deduct stock
        await tx.katalog_menu.update({
          where: { id: menu.id },
          data: { stok: menu.stok - jumlah },
        });

        const subtotal = menu.harga_jual * jumlah;
        total_item += jumlah;
        total_harga += subtotal;

        detailPesananData.push({
          menu: { connect: { id: menu.id } },
          nama_menu: menu.nama_item,
          harga: menu.harga_jual,
          jumlah: jumlah,
          subtotal: subtotal,
        });
      }

      // 4. Generate nomor pesanan
      const lastPesanan = await tx.pesanan.findFirst({
        orderBy: { id: 'desc' },
        select: { nomor_pesanan: true },
      });

      const nextNomorPesanan = generateNomorPesanan(
        lastPesanan?.nomor_pesanan || null,
      );

      // 5. Create pesanan
      const newPesanan = await tx.pesanan.create({
        data: {
          nomor_pesanan: nextNomorPesanan,
          nama_pelanggan: data.nama_pelanggan || null,
          total_item,
          total_harga,
          status: 'belum_bayar',
          detail_pesanan: {
            create: detailPesananData,
          },
        },
        include: {
          detail_pesanan: true,
        },
      });

      return newPesanan;
    });
  }

  private groupItems(items: CreatePesananItemDto[]): Map<number, number> {
    const map = new Map<number, number>();
    for (const item of items) {
      const current = map.get(item.id_menu) || 0;
      map.set(item.id_menu, current + item.jumlah);
    }
    return map;
  }

  async findAll(
    filter: GetPesananFilterDto,
  ): Promise<PaginatedResult<pesanan & { detail_pesanan: detail_pesanan[] }>> {
    const { page = 1, limit = 10, search, status } = filter;

    const skip = (page - 1) * limit;

    const where: Prisma.pesananWhereInput = {};

    if (search) {
      where.OR = [
        { nomor_pesanan: { contains: search, mode: 'insensitive' } },
        { nama_pelanggan: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.pesanan.count({ where }),
      this.prisma.pesanan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: {
          detail_pesanan: true,
        },
      }),
    ]);

    const lastPage = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        lastPage,
        currentPage: page,
        perPage: limit,
        prev: page > 1 ? page - 1 : null,
        next: page < lastPage ? page + 1 : null,
      },
    };
  }

  async findOne(
    id: number,
  ): Promise<pesanan & { detail_pesanan: detail_pesanan[] }> {
    const pesanan = await this.prisma.pesanan.findUnique({
      where: { id },
      include: {
        detail_pesanan: true,
      },
    });

    if (!pesanan) {
      throw new NotFoundException(`Pesanan dengan ID ${id} tidak ditemukan.`);
    }

    return pesanan;
  }

  async updatePembayaran(
    id: number,
    data: UpdatePembayaranDto,
  ): Promise<pesanan & { detail_pesanan: detail_pesanan[] }> {
    await this.findOne(id); // ensure exists

    return this.prisma.pesanan.update({
      where: { id },
      data: {
        metode_pembayaran: data.metode_pembayaran,
        status: data.status,
      },
      include: {
        detail_pesanan: true,
      },
    });
  }

  async remove(id: number): Promise<{ message: string }> {
    const pesanan = await this.findOne(id); // ensure exists

    await this.prisma.$transaction(async (tx) => {
      // 1. Restore stock
      for (const item of pesanan.detail_pesanan) {
        await tx.katalog_menu.update({
          where: { id: item.id_menu },
          data: {
            stok: {
              increment: item.jumlah,
            },
          },
        });
      }

      // 2. Delete detail_pesanan
      await tx.detail_pesanan.deleteMany({
        where: { id_pesanan: id },
      });

      // 3. Delete pesanan
      await tx.pesanan.delete({
        where: { id },
      });
    });

    return { message: `Pesanan dengan ID ${id} berhasil dihapus.` };
  }
}
