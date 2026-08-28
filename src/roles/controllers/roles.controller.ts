import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { RolesService } from '../services/roles.service.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { Permissions } from '../../auth/decorators/permissions.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { PERMISSIONS } from '../../common/constants/index.js';
import { UpdateRolePermissionsDto } from '../dto/update-role-permissions.dto.js';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Roles(Role.OWNER)
  @Permissions(PERMISSIONS.ROLE_READ)
  @ApiOperation({
    summary: 'Daftar semua role',
    description: 'Mengambil daftar role beserta permission yang dimiliki.',
  })
  @ApiResponse({ status: 200, description: 'Daftar role berhasil diambil' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findAll() {
    return this.rolesService.findAll();
  }

  @Put(':role/permissions')
  @Roles(Role.OWNER)
  @Permissions(PERMISSIONS.ROLE_UPDATE)
  @ApiOperation({
    summary: 'Update permission untuk role tertentu',
    description: 'Mengubah daftar permission untuk role (misal KASIR).',
  })
  @ApiParam({ name: 'role', enum: Role, description: 'Role yang akan diupdate' })
  @ApiResponse({ status: 200, description: 'Role permissions berhasil diupdate' })
  async updatePermissions(
    @Param('role') role: Role,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.rolesService.updatePermissions(role, dto);
  }
}
