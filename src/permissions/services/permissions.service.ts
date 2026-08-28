import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreatePermissionDto } from '../dto/create-permission.dto.js';
import { UpdatePermissionDto } from '../dto/update-permission.dto.js';

export interface PermissionResponse {
  readonly id: number;
  readonly name: string;
}

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<{ message: string; data: PermissionResponse[] }> {
    const permissions = await this.prisma.permission.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    return {
      message: 'Daftar permission berhasil diambil',
      data: permissions,
    };
  }

  async create(dto: CreatePermissionDto): Promise<{ message: string; data: PermissionResponse }> {
    const existing = await this.prisma.permission.findUnique({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException('Permission dengan nama tersebut sudah ada');
    }

    const permission = await this.prisma.permission.create({
      data: { name: dto.name },
    });
    
    this.logger.log(`Permission created: ${permission.name}`);
    return {
      message: 'Permission berhasil dibuat',
      data: permission,
    };
  }

  async update(id: number, dto: UpdatePermissionDto): Promise<{ message: string; data: PermissionResponse }> {
    const target = await this.prisma.permission.findUnique({ where: { id } });
    if (!target) {
      throw new NotFoundException('Permission tidak ditemukan');
    }

    const nameExists = await this.prisma.permission.findUnique({ where: { name: dto.name } });
    if (nameExists && nameExists.id !== id) {
      throw new ConflictException('Permission dengan nama tersebut sudah digunakan');
    }

    const updated = await this.prisma.permission.update({
      where: { id },
      data: { name: dto.name },
    });
    
    this.logger.log(`Permission updated ID ${id}: ${updated.name}`);
    return {
      message: 'Permission berhasil diperbarui',
      data: updated,
    };
  }
}
