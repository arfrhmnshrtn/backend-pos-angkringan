import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalysisService } from './analysis.service.js';
import { SalesAnalysisQueryDto } from './dto/sales-analysis-query.dto.js';
import { SalesAnalysisResponseDto } from './dto/sales-analysis-response.dto.js';
import { Permissions } from '../auth/decorators/index.js';
import { PERMISSIONS } from '../common/constants/index.js';

@ApiTags('Analysis')
@ApiBearerAuth()
@Controller('analysis/sales')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Get()
  @Permissions(PERMISSIONS.SALES_ANALYSIS_READ)
  @ApiOperation({
    summary: 'Mendapatkan Analisis Penjualan',
    description: 'Endpoint ini memberikan informasi analisis penjualan, termasuk summary omzet, laba kotor, produk terlaris, rentang waktu, dll.',
  })
  @ApiResponse({
    status: 200,
    description: 'Analisis penjualan berhasil diambil.',
    type: SalesAnalysisResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Parameter tanggal atau period tidak valid.' })
  @ApiResponse({ status: 401, description: 'User belum terautentikasi (Token tidak valid/kadaluarsa).' })
  @ApiResponse({ status: 403, description: 'User tidak memiliki permission sales_analysis.read.' })
  async getSalesAnalysis(@Query() query: SalesAnalysisQueryDto) {
    const data = await this.analysisService.getSalesAnalysis(query);
    return {
      message: 'Analisis penjualan berhasil diambil',
      data,
    };
  }
}
