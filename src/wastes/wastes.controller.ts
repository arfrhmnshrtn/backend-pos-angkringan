import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { WastesService } from './wastes.service.js';
import { CreateWasteDto } from './dto/create-waste.dto.js';
import { UpdateWasteDto } from './dto/update-waste.dto.js';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../common/constants/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { waste_type, waste_reason } from '@prisma/client';

@ApiTags('Wastes')
@ApiBearerAuth()
@Controller('wastes')
export class WastesController {
  constructor(private readonly wastesService: WastesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions(PERMISSIONS.WASTE_CREATE)
  @ApiOperation({
    summary: 'Mencatat barang terbuang (Create Waste)',
    description: 'Endpoint ini digunakan untuk mencatat barang/bahan terbuang. Akan mengurangi stok barang yang direferensikan berdasarkan jenisnya dan menghitung kerugian(loss).'
  })
  @ApiBody({ type: CreateWasteDto, examples: {
    product: {
      summary: 'Contoh Pencatatan Produk Terbuang',
      value: { type: 'PRODUCT', item_id: 12, quantity: 2, reason: 'BASI', note: 'Produk sudah basi dan berbau' }
    },
    ingredient: {
      summary: 'Contoh Pencatatan Bahan Terbuang',
      value: { type: 'INGREDIENT', item_id: 5, quantity: 1, reason: 'LAINNYA', note: 'Tumpah saat dipindahkan' }
    }
  }})
  @ApiResponse({ status: 201, description: 'Barang terbuang berhasil dicatat', schema: { example: {
    message: "Barang terbuang berhasil dicatat",
    data: {
      id: 1,
      type: "INGREDIENT",
      id_katalog_menu: null,
      id_ingredient: 5,
      quantity: 1,
      unit: "kg",
      cost_per_unit: 15000,
      total_loss: 15000,
      reason: "LAINNYA",
      note: "Tumpah saat dipindahkan",
      created_by: 1,
      created_at: "2026-08-15T10:00:00.000Z",
      updated_at: "2026-08-15T10:00:00.000Z"
    }
  }}})
  @ApiResponse({ status: 400, description: 'Validasi gagal, atau stok tidak mencukupi untuk mencatat.', schema: { example: { statusCode: 400, message: "Stok tidak mencukupi untuk mencatat barang terbuang.", error: "Bad Request" } }})
  create(@Body() createWasteDto: CreateWasteDto, @CurrentUser() user: JwtPayload) {
    return this.wastesService.create(createWasteDto, user.id);
  }

  @Get('summary')
  @Permissions(PERMISSIONS.WASTE_ANALYSIS)
  @ApiOperation({
    summary: 'Melihat ringkasan total kerugian',
    description: 'Menampilkan metrik ringkasan kerugian akibat barang terbuang.'
  })
  @ApiQuery({ name: 'startDate', required: false, type: String, example: '2026-08-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, example: '2026-08-31' })
  @ApiResponse({ status: 200, description: 'Ringkasan berhasil diambil', schema: { example: {
    message: "Ringkasan barang terbuang berhasil diambil",
    data: {
      total_waste_amount: 2150000,
      total_waste_quantity: 127,
      total_records: 35
    }
  }}})
  getSummary(@Query() query: any) {
    return this.wastesService.getSummary(query);
  }

  @Get('analysis')
  @Permissions(PERMISSIONS.WASTE_ANALYSIS)
  @ApiOperation({
    summary: 'Analisis Lengkap Barang Terbuang',
    description: 'Endpoint ini memberikan aggregasi data (berdasarkan alasan, riwayat bulanan/harian, dan daftar barang yang paling banyak terbuang).'
  })
  @ApiQuery({ name: 'startDate', required: false, type: String, example: '2026-08-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, example: '2026-08-31' })
  @ApiQuery({ name: 'type', enum: waste_type, required: false })
  @ApiQuery({ name: 'item_id', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Analisis berhasil diambil', schema: { example: {
    message: "Analisis barang terbuang berhasil diambil",
    data: {
      summary: { total_loss: 2150000, total_quantity: 127, total_records: 35, average_loss_per_record: 61428.57, waste_ratio: 2.5 },
      by_reason: [ { reason: "BASI", quantity: 40, total_loss: 850000 } ],
      top_wasted_items: [ { id: 12, type: "INGREDIENT", name: "Beras", quantity: 35, total_loss: 450000 } ],
      daily_waste: [ { date: "2026-08-15", quantity: 10, total_loss: 150000 } ]
    }
  }}})
  getAnalysis(@Query() query: any) {
    return this.wastesService.getAnalysis(query);
  }

  @Get()
  @Permissions(PERMISSIONS.WASTE_READ)
  @ApiOperation({
    summary: 'Mengambil daftar barang terbuang beserta filternya',
    description: 'Mengambil seluruh list log pencatatan barang yang pernah dibuang.'
  })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'type', enum: waste_type, required: false })
  @ApiQuery({ name: 'reason', enum: waste_reason, required: false })
  @ApiQuery({ name: 'item_id', required: false, type: Number })
  @ApiQuery({ name: 'created_by', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Daftar barang terbuang berhasil diambil', schema: { example: {
    message: "Daftar barang terbuang berhasil diambil",
    data: [
      {
        id: 1, type: "INGREDIENT", quantity: 2, unit: "kg", cost_per_unit: 15000, total_loss: 30000, reason: "BASI", note: "Tidak habis", created_by: 1,
        created_at: "2026-08-15T10:00:00.000Z", updated_at: "2026-08-15T10:00:00.000Z",
        item_id: 12, item_name: "Beras",
        user: { id: 1, fullname: "Owner" }
      }
    ],
    meta: { page: 1, limit: 20, total: 100, total_pages: 5 }
  }}})
  findAll(@Query() query: any) {
    return this.wastesService.findAll(query);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.WASTE_READ)
  @ApiOperation({ summary: 'Melihat detail 1 log barang terbuang' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Detail waste', schema: { example: {
    message: "Detail barang terbuang berhasil diambil",
    data: {
      id: 1, type: "INGREDIENT", quantity: 2, total_loss: 30000, reason: "BASI", note: "Tidak habis",
      created_by: 1, created_at: "2026-08-15T10:00:00.000Z",
      item_id: 12, item_name: "Beras",
      user: { id: 1, fullname: "Owner" },
      stock_movements: [ { id: 10, type: "WASTE", quantity: -2, stock_before: 50, stock_after: 48, reference_type: "WASTE", created_at: "2026-08-15T10:00:00.000Z" } ]
    }
  }}})
  @ApiResponse({ status: 404, description: 'Not Found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.wastesService.findOne(id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.WASTE_UPDATE)
  @ApiOperation({
    summary: 'Mengkoreksi log barang terbuang',
    description: 'Mengubah catatan, alasan, atau kuantitas barang. Jika kuantitas berubah, stok akan disesuaikan kembali (direstitusi atau dipotong).'
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateWasteDto })
  @ApiResponse({ status: 200, description: 'Berhasil diupdate' })
  @ApiResponse({ status: 400, description: 'Tidak bisa update type atau id, maupun stok gagal' })
  @ApiResponse({ status: 404, description: 'Catatan tidak ditemukan' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateWasteDto: UpdateWasteDto, @CurrentUser() user: JwtPayload) {
    return this.wastesService.update(id, updateWasteDto, user.id);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.WASTE_DELETE)
  @ApiOperation({
    summary: 'Menghapus barang terbuang dan mengembalikan stok',
    description: 'Catatan waste akan dihapus beserta riwayat stock_movement-nya. Stok menu/ingredient akan dikembalikan seperti sedia kala (stok + quantity).'
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Barang terbuang dihapus dan stok dikembalikan' })
  @ApiResponse({ status: 404, description: 'Barang terbuang tidak ditemukan' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    return this.wastesService.remove(id, user.id);
  }
}
