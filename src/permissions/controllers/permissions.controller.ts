import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionsService } from '../services/permissions.service.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { Permissions as PermissionsDecorator } from '../../auth/decorators/permissions.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { PERMISSIONS } from '../../common/constants/index.js';

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @Roles(Role.OWNER)
  @PermissionsDecorator(PERMISSIONS.ROLE_READ)
  @ApiOperation({
    summary: 'Daftar semua permission',
    description: 'Mengambil daftar seluruh permission yang tersedia.',
  })
  @ApiResponse({ status: 200, description: 'Daftar permission berhasil diambil' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findAll() {
    return this.permissionsService.findAll();
  }
}
