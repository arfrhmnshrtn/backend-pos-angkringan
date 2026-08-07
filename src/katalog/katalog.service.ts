import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKatalogDto } from './dto/create-katalog.dto';
import { UpdateKatalogDto } from './dto/update-katalog.dto';

@Injectable()
export class KatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createKatalogDto: CreateKatalogDto) {
    return this.prisma.katalog_menu.create({
      data: createKatalogDto,
    });
  }

  async findAll() {
    return this.prisma.katalog_menu.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.katalog_menu.findUnique({
      where: { id },
    });
    if (!item) {
      throw new NotFoundException(`Katalog menu dengan ID #${id} tidak ditemukan`);
    }
    return item;
  }

  async update(id: number, updateKatalogDto: UpdateKatalogDto) {
    await this.findOne(id);
    return this.prisma.katalog_menu.update({
      where: { id },
      data: updateKatalogDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.katalog_menu.delete({
      where: { id },
    });
  }
}
