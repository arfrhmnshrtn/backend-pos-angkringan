import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface RoleWithPermissions {
  readonly role: string;
  readonly permissions: string[];
}

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<{ message: string; data: RoleWithPermissions[] }> {
    const rolePermissions = await this.prisma.role_permission.findMany({
      include: {
        permission: { select: { name: true } },
      },
      orderBy: { role: 'asc' },
    });

    // Group by role
    const rolesMap = new Map<string, string[]>();

    for (const rp of rolePermissions) {
      const existing = rolesMap.get(rp.role) ?? [];
      existing.push(rp.permission.name);
      rolesMap.set(rp.role, existing);
    }

    const data: RoleWithPermissions[] = Array.from(rolesMap.entries()).map(
      ([role, permissions]) => ({
        role,
        permissions,
      }),
    );

    return {
      message: 'Daftar role berhasil diambil',
      data,
    };
  }
}
