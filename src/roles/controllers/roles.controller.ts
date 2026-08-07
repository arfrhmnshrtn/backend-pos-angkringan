import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from '../services/roles.service.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { Permissions } from '../../auth/decorators/permissions.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { PERMISSIONS } from '../../common/constants/index.js';

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
}
