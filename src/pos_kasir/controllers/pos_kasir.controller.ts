import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { PosKasirService } from '../services/pos_kasir.service.js';
import {
  CreatePesananDto,
  UpdatePembayaranDto,
  GetPesananFilterDto,
} from '../dto/pesanan.dto.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';

@ApiTags('POS Kasir (Pesanan)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pos-kasir')
export class PosKasirController {
  constructor(private readonly posKasirService: PosKasirService) {}

  @Post()
  @ApiOperation({ summary: 'Buat pesanan baru dari kasir' })
  async create(@Body() createPesananDto: CreatePesananDto) {
    return this.posKasirService.createOrder(createPesananDto);
  }

  @Get()
  @ApiOperation({ summary: 'Daftar pesanan dengan filter dan pencarian' })
  async findAll(@Query() filter: GetPesananFilterDto) {
    return this.posKasirService.findAllOrders(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail pesanan dan item menu' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.posKasirService.findOneOrder(id);
  }

  @Patch(':id/pembayaran')
  @ApiOperation({ summary: 'Update status pembayaran pesanan' })
  async updatePembayaran(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePembayaranDto: UpdatePembayaranDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.posKasirService.updatePembayaran(id, updatePembayaranDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hapus pesanan (belum bayar / hutang) dan kembalikan stok' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.posKasirService.deleteOrder(id);
  }
}
