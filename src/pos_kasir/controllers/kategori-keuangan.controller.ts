import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { KategoriKeuanganService } from '../services/kategori-keuangan.service.js';
import { CreateKategoriKeuanganDto, UpdateKategoriKeuanganDto } from '../dto/kategori-keuangan.dto.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';

@ApiTags('Kategori Keuangan')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kategori-keuangan')
export class KategoriKeuanganController {
  constructor(private readonly kategoriKeuanganService: KategoriKeuanganService) {}

  @Post()
  @ApiOperation({ summary: 'Create new kategori keuangan' })
  async create(@Body() createKategoriKeuanganDto: CreateKategoriKeuanganDto) {
    return this.kategoriKeuanganService.create(createKategoriKeuanganDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all kategori keuangan' })
  async findAll() {
    return this.kategoriKeuanganService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get kategori keuangan by id' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.kategoriKeuanganService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update kategori keuangan' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateKategoriKeuanganDto: UpdateKategoriKeuanganDto,
  ) {
    return this.kategoriKeuanganService.update(id, updateKategoriKeuanganDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete kategori keuangan' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.kategoriKeuanganService.remove(id);
  }
}
