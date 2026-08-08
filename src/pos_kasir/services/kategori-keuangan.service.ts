import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CreateKategoriKeuanganDto,
  UpdateKategoriKeuanganDto,
} from '../dto/kategori-keuangan.dto.js';

@Injectable()
export class KategoriKeuanganService {
  private readonly logger = new Logger(KategoriKeuanganService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateKategoriKeuanganDto) {
    const existing = await this.prisma.kategori_keuangan.findUnique({
      where: { nama: createDto.nama },
    });

    if (existing) {
      throw new ConflictException(`Kategori dengan nama ${createDto.nama} sudah ada`);
    }

    const kategori = await this.prisma.kategori_keuangan.create({
      data: {
        nama: createDto.nama,
        jenis: createDto.jenis,
      },
    });

    return {
      success: true,
      message: 'Kategori berhasil dibuat',
      data: kategori,
    };
  }

  async findAll() {
    const data = await this.prisma.kategori_keuangan.findMany({
      orderBy: { created_at: 'desc' },
    });

    return {
      success: true,
      message: 'Daftar kategori berhasil diambil',
      data,
    };
  }

  async findOne(id: number) {
    const data = await this.prisma.kategori_keuangan.findUnique({
      where: { id },
    });

    if (!data) {
      throw new NotFoundException(`Kategori dengan id ${id} tidak ditemukan`);
    }

    return {
      success: true,
      message: 'Kategori berhasil diambil',
      data,
    };
  }

  async update(id: number, updateDto: UpdateKategoriKeuanganDto) {
    await this.findOne(id); // Check existence

    if (updateDto.nama) {
      const existing = await this.prisma.kategori_keuangan.findUnique({
        where: { nama: updateDto.nama },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Kategori dengan nama ${updateDto.nama} sudah ada`);
      }
    }

    const updated = await this.prisma.kategori_keuangan.update({
      where: { id },
      data: updateDto,
    });

    return {
      success: true,
      message: 'Kategori berhasil diperbarui',
      data: updated,
    };
  }

  async remove(id: number) {
    await this.findOne(id); // Check existence

    // Add check if used in transaksi_keuangan before delete if necessary
    const isUsed = await this.prisma.transaksi_keuangan.findFirst({
      where: { id_kategori: id },
    });

    if (isUsed) {
      throw new ConflictException('Kategori tidak dapat dihapus karena sudah digunakan dalam transaksi');
    }

    await this.prisma.kategori_keuangan.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Kategori berhasil dihapus',
      data: null,
    };
  }
}
