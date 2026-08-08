import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { TransaksiKeuanganService } from '../services/transaksi-keuangan.service.js';
import { CreateTransaksiKeuanganDto, GetTransaksiFilterDto } from '../dto/transaksi-keuangan.dto.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';

@ApiTags('Transaksi Keuangan')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transaksi-keuangan')
export class TransaksiKeuanganController {
  constructor(private readonly transaksiService: TransaksiKeuanganService) {}

  @Post('pemasukan')
  @ApiOperation({ summary: 'Create pemasukan manual' })
  async createPemasukan(
    @Body() createDto: CreateTransaksiKeuanganDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.transaksiService.createTransaksi(createDto, userId, 'pemasukan');
  }

  @Post('pengeluaran')
  @ApiOperation({ summary: 'Create pengeluaran manual' })
  async createPengeluaran(
    @Body() createDto: CreateTransaksiKeuanganDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.transaksiService.createTransaksi(createDto, userId, 'pengeluaran');
  }

  @Get()
  @ApiOperation({ summary: 'Get all transaksi keuangan' })
  async findAll(@Query() filter: GetTransaksiFilterDto) {
    return this.transaksiService.findAll(filter);
  }
}
