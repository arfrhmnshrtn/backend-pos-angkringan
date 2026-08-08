import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { LaporanService } from '../services/laporan.service.js';
import { LaporanFilterDto } from '../dto/laporan.dto.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';

@ApiTags('Laporan Keuangan & Penjualan')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('laporan')
export class LaporanController {
  constructor(private readonly laporanService: LaporanService) {}

  @Get('harian')
  @ApiOperation({ summary: 'Laporan Harian' })
  async getHarian(@Query() filter: LaporanFilterDto) {
    return this.laporanService.getReport('harian', filter);
  }

  @Get('mingguan')
  @ApiOperation({ summary: 'Laporan Mingguan' })
  async getMingguan(@Query() filter: LaporanFilterDto) {
    return this.laporanService.getReport('mingguan', filter);
  }

  @Get('bulanan')
  @ApiOperation({ summary: 'Laporan Bulanan' })
  async getBulanan(@Query() filter: LaporanFilterDto) {
    return this.laporanService.getReport('bulanan', filter);
  }

  @Get('tahunan')
  @ApiOperation({ summary: 'Laporan Tahunan' })
  async getTahunan(@Query() filter: LaporanFilterDto) {
    return this.laporanService.getReport('tahunan', filter);
  }
}
