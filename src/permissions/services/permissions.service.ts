import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

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
}
