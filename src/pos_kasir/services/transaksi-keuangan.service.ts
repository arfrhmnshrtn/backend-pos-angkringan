import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { generateTransaksiNumber } from '../helpers/transaksi-number.generator.js';
import { getPaginationParams, generatePagination } from '../helpers/pagination.helper.js';
import { CreateTransaksiKeuanganDto, GetTransaksiFilterDto } from '../dto/transaksi-keuangan.dto.js';
import { jenis_transaksi } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class TransaksiKeuanganService {
  private readonly logger = new Logger(TransaksiKeuanganService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createTransaksi(createDto: CreateTransaksiKeuanganDto, id_user: number, jenis: jenis_transaksi) {
    // Validasi kategori
    const kategori = await this.prisma.kategori_keuangan.findUnique({
      where: { id: createDto.id_kategori },
    });

    if (!kategori) {
      throw new NotFoundException('Kategori tidak ditemukan');
    }

    if (kategori.jenis !== jenis) {
      throw new BadRequestException(`Kategori ${kategori.nama} tidak valid untuk jenis ${jenis}`);
    }

    // Generate Nomor Transaksi
    const nomor_transaksi = await generateTransaksiNumber(this.prisma);

    const transaksi = await this.prisma.transaksi_keuangan.create({
      data: {
        nomor_transaksi,
        jenis,
        id_kategori: createDto.id_kategori,
        nominal: createDto.nominal,
        metode_pembayaran: createDto.metode_pembayaran,
        keterangan: createDto.keterangan,
        id_user,
      },
      include: {
        kategori: true,
      }
    });

    return {
      success: true,
      message: `${jenis === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'} berhasil dicatat`,
      data: transaksi,
    };
  }

  async findAll(filter: GetTransaksiFilterDto) {
    const { skip, take, page, limit } = getPaginationParams(filter.page, filter.limit);

    const whereCondition: Prisma.transaksi_keuanganWhereInput = {};

    if (filter.jenis) {
      whereCondition.jenis = filter.jenis;
    }

    if (filter.id_kategori) {
      whereCondition.id_kategori = filter.id_kategori;
    }

    if (filter.search) {
      whereCondition.OR = [
        { nomor_transaksi: { contains: filter.search, mode: 'insensitive' } },
        { keterangan: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const sortField = filter.sort || 'created_at';
    const sortOrder = filter.order || 'desc';

    const [data, total] = await Promise.all([
      this.prisma.transaksi_keuangan.findMany({
        where: whereCondition,
        skip,
        take,
        orderBy: { [sortField]: sortOrder },
        include: { 
          kategori: true, 
          user: { select: { id: true, fullname: true } },
          pesanan: {
            include: {
              detail_pesanan: {
                include: {
                  menu: true,
                }
              }
            }
          }
        },
      }),
      this.prisma.transaksi_keuangan.count({ where: whereCondition }),
    ]);

    return {
      success: true,
      message: 'Data transaksi berhasil diambil',
      ...generatePagination(data, total, page, limit),
    };
  }

  async deleteTransaksi(id: number) {
    const trx = await this.prisma.transaksi_keuangan.findUnique({
      where: { id },
    });

    if (!trx) {
      throw new NotFoundException('Data transaksi tidak ditemukan');
    }

    if (trx.id_pesanan !== null) {
      throw new BadRequestException(
        'Transaksi pemasukan yang berasal dari penjualan otomatis tidak dapat dihapus secara manual.'
      );
    }

    await this.prisma.transaksi_keuangan.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Transaksi berhasil dihapus',
    };
  }
}
