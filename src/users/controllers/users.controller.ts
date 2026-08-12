import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from '../services/users.service.js';
import { CreateUserDto } from '../dto/create-user.dto.js';
import { UpdateUserDto } from '../dto/update-user.dto.js';
import { UpdateStatusDto } from '../dto/update-status.dto.js';
import { ResetPinDto } from '../dto/reset-pin.dto.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { Permissions } from '../../auth/decorators/permissions.decorator.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { PERMISSIONS } from '../../common/constants/index.js';
import { Public } from '../../auth/decorators/public.decorator.js';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface.js';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.OWNER)
  @Permissions(PERMISSIONS.CASHIER_READ)
  @ApiOperation({
    summary: 'Daftar semua user',
    description: 'Mengambil daftar semua user aktif (tidak termasuk yang soft deleted).',
  })
  @ApiResponse({ status: 200, description: 'Daftar user berhasil diambil' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findAll() {
    return this.usersService.findAll();
  }

  @Public()
  @Get('kasir')
  @ApiOperation({
    summary: 'Daftar kasir aktif',
    description: 'Mengambil daftar kasir aktif untuk halaman login.',
  })
  @ApiResponse({ status: 200, description: 'Daftar kasir berhasil diambil' })
  async findKasirList() {
    return this.usersService.findKasirList();
  }
  
  @Public()
  @Post('setup-owner')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Setup Owner Pertama (Public)',
    description: 'Endpoint publik untuk membuat akun owner pertama kali jika database kosong. Hanya dapat dipanggil sekali.',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'Owner berhasil dibuat' })
  @ApiResponse({ status: 403, description: 'Owner sudah ada di database' })
  async setupOwner(@Body() createUserDto: CreateUserDto) {
    return this.usersService.setupOwner(createUserDto);
  }

  @Get(':id')
  @Roles(Role.OWNER)
  @Permissions(PERMISSIONS.CASHIER_READ)
  @ApiOperation({
    summary: 'Detail user',
    description: 'Mengambil detail satu user berdasarkan ID.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID user' })
  @ApiResponse({ status: 200, description: 'Detail user berhasil diambil' })
  @ApiResponse({ status: 404, description: 'User tidak ditemukan' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.OWNER)
  @Permissions(PERMISSIONS.CASHIER_CREATE)
  @ApiOperation({
    summary: 'Buat user baru (Kasir / Owner)',
    description: 'Membuat akun kasir atau owner baru. Hanya owner yang bisa membuat akun.',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User berhasil dibuat' })
  @ApiResponse({ status: 400, description: 'Validasi gagal' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.create(createUserDto, user.role);
  }

  @Patch(':id')
  @Roles(Role.OWNER)
  @Permissions(PERMISSIONS.CASHIER_UPDATE)
  @ApiOperation({
    summary: 'Update user',
    description: 'Mengubah data user (nama). Hanya owner yang bisa mengubah.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID user' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'User berhasil diperbarui' })
  @ApiResponse({ status: 404, description: 'User tidak ditemukan' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.update(id, updateUserDto, user.role);
  }

  @Patch(':id/status')
  @Roles(Role.OWNER)
  @Permissions(PERMISSIONS.CASHIER_UPDATE)
  @ApiOperation({
    summary: 'Ubah status user',
    description: 'Mengaktifkan atau menonaktifkan akun kasir.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID user' })
  @ApiBody({ type: UpdateStatusDto })
  @ApiResponse({ status: 200, description: 'Status berhasil diubah' })
  @ApiResponse({ status: 404, description: 'User tidak ditemukan' })
  @ApiResponse({ status: 409, description: 'Status sudah sama' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.updateStatus(id, updateStatusDto, user.role);
  }

  @Patch(':id/reset-pin')
  @Roles(Role.OWNER)
  @Permissions(PERMISSIONS.CASHIER_UPDATE)
  @ApiOperation({
    summary: 'Reset PIN kasir',
    description: 'Mereset PIN kasir. Semua token aktif kasir akan direvoke.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID user' })
  @ApiBody({ type: ResetPinDto })
  @ApiResponse({ status: 200, description: 'PIN berhasil direset' })
  @ApiResponse({ status: 404, description: 'User tidak ditemukan' })
  async resetPin(
    @Param('id', ParseIntPipe) id: number,
    @Body() resetPinDto: ResetPinDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.resetPin(id, resetPinDto, user.role);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  @Permissions(PERMISSIONS.CASHIER_DELETE)
  @ApiOperation({
    summary: 'Hapus user',
    description: 'Menghapus akun kasir (soft delete). Semua token akan direvoke.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID user' })
  @ApiResponse({ status: 200, description: 'User berhasil dihapus' })
  @ApiResponse({ status: 404, description: 'User tidak ditemukan' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.remove(id, user.role);
  }
}
