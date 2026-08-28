import { Controller, Get, Post, Put, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { PermissionsService } from '../services/permissions.service.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { Permissions as PermissionsDecorator } from '../../auth/decorators/permissions.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { PERMISSIONS } from '../../common/constants/index.js';
import { CreatePermissionDto } from '../dto/create-permission.dto.js';
import { UpdatePermissionDto } from '../dto/update-permission.dto.js';

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

  @Post()
  @Roles(Role.OWNER)
  @PermissionsDecorator(PERMISSIONS.ROLE_UPDATE) // Menggunakan permission yang sama dengan mengupdate role karena ini masuk ranah pengaturan akses
  @ApiOperation({
    summary: 'Membuat permission baru',
    description: 'Menambahkan opsi permission baru ke database.',
  })
  @ApiResponse({ status: 201, description: 'Permission berhasil dibuat' })
  @ApiResponse({ status: 409, description: 'Conflict - Nama permission sudah ada' })
  async create(@Body() dto: CreatePermissionDto) {
    return this.permissionsService.create(dto);
  }

  @Put(':id')
  @Roles(Role.OWNER)
  @PermissionsDecorator(PERMISSIONS.ROLE_UPDATE)
  @ApiOperation({
    summary: 'Mengedit permission',
    description: 'Mengubah nama permission berdasarkan ID.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'ID permission' })
  @ApiResponse({ status: 200, description: 'Permission berhasil diupdate' })
  @ApiResponse({ status: 404, description: 'Not Found - ID tidak ditemukan' })
  @ApiResponse({ status: 409, description: 'Conflict - Nama permission sudah digunakan' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePermissionDto,
  ) {
    return this.permissionsService.update(id, dto);
  }
}
