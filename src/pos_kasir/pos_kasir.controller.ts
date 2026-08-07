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
} from '@nestjs/common';
import { PosKasirService } from './pos_kasir.service';
import { CreatePesananDto } from './dto/create-pesanan.dto';
import { UpdatePembayaranDto } from './dto/update-pembayaran.dto';
import { GetPesananFilterDto } from './dto/get-pesanan-filter.dto';
import { pesanan, detail_pesanan } from '@prisma/client';
import { PaginatedResult } from './types/pagination.type';

@Controller('pos-kasir')
export class PosKasirController {
  constructor(private readonly posKasirService: PosKasirService) {}

  @Post()
  async create(
    @Body() createPesananDto: CreatePesananDto,
  ): Promise<{ data: pesanan & { detail_pesanan: detail_pesanan[] } }> {
    const result = await this.posKasirService.createOrder(createPesananDto);
    return { data: result };
  }

  @Get()
  async findAll(
    @Query() filterDto: GetPesananFilterDto,
  ): Promise<PaginatedResult<pesanan & { detail_pesanan: detail_pesanan[] }>> {
    return this.posKasirService.findAll(filterDto);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ data: pesanan & { detail_pesanan: detail_pesanan[] } }> {
    const result = await this.posKasirService.findOne(id);
    return { data: result };
  }

  @Patch(':id/pembayaran')
  async updatePembayaran(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePembayaranDto: UpdatePembayaranDto,
  ): Promise<{ data: pesanan & { detail_pesanan: detail_pesanan[] } }> {
    const result = await this.posKasirService.updatePembayaran(
      id,
      updatePembayaranDto,
    );
    return { data: result };
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    return this.posKasirService.remove(id);
  }
}
