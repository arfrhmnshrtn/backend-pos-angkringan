import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PengeluaranBahanBakuService } from '../services/pengeluaran-bahan-baku.service.js';
import { CreatePengeluaranBahanBakuDto, UpdatePengeluaranBahanBakuDto, GetPengeluaranBahanBakuFilterDto } from '../dto/pengeluaran-bahan-baku.dto.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { Permissions } from '../../auth/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/index.js';

@ApiTags('Pengeluaran Bahan Baku')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('expenses/materials')
export class PengeluaranBahanBakuController {
  constructor(private readonly service: PengeluaranBahanBakuService) {}

  @Post()
  @Permissions(PERMISSIONS.CASH_TRANSACTION_CREATE)
  @ApiOperation({ summary: 'Mencatat pengeluaran bahan baku baru' })
  @ApiResponse({ status: 201, description: 'Pengeluaran bahan baku berhasil dibuat' })
  create(@Body() createDto: CreatePengeluaranBahanBakuDto, @CurrentUser('id') userId: number) {
    return this.service.create(createDto, userId);
  }

  @Get()
  @Permissions(PERMISSIONS.CASH_TRANSACTION_READ)
  @ApiOperation({ summary: 'Mengambil daftar pengeluaran bahan baku dan summary' })
  findAll(@Query() filter: GetPengeluaranBahanBakuFilterDto) {
    return this.service.findAll(filter);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.CASH_TRANSACTION_UPDATE)
  @ApiOperation({ summary: 'Memperbarui data pengeluaran bahan baku' })
  update(@Param('id') id: string, @Body() updateDto: UpdatePengeluaranBahanBakuDto) {
    return this.service.update(+id, updateDto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.CASH_TRANSACTION_DELETE)
  @ApiOperation({ summary: 'Menghapus data pengeluaran bahan baku' })
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
