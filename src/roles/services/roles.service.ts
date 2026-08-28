import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UpdateRolePermissionsDto } from '../dto/update-role-permissions.dto.js';
import { user_role } from '@prisma/client';

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

  async updatePermissions(
    roleStr: string,
    dto: UpdateRolePermissionsDto,
  ): Promise<{ message: string }> {
    // Validasi enum
    const roleMap: Record<string, user_role> = {
      OWNER: 'OWNER',
      KASIR: 'KASIR',
    };
    const roleEnum = roleMap[roleStr.toUpperCase()];
    if (!roleEnum) {
      throw new BadRequestException('Role tidak valid');
    }

    if (dto.permissionIds.length > 0) {
      const permissionsCount = await this.prisma.permission.count({
        where: { id: { in: dto.permissionIds } },
      });

      if (permissionsCount !== dto.permissionIds.length) {
        throw new NotFoundException('Satu atau lebih permission tidak ditemukan');
      }
    }

    await this.prisma.$transaction(async (prisma) => {
      await prisma.role_permission.deleteMany({
        where: { role: roleEnum },
      });

      if (dto.permissionIds.length > 0) {
        const dataToInsert = dto.permissionIds.map((id) => ({
          role: roleEnum,
          permission_id: id,
        }));
        await prisma.role_permission.createMany({
          data: dataToInsert,
        });
      }
    });

    this.logger.log(`Permissions updated for role ${roleEnum}`);
    return { message: 'Role permissions berhasil diupdate' };
  }
}
