import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PosKasirService } from './pos_kasir.service';
import { CreatePosKasirDto } from './dto/create-pos_kasir.dto';
import { UpdatePosKasirDto } from './dto/update-pos_kasir.dto';

@Controller('pos-kasir')
export class PosKasirController {
  constructor(private readonly posKasirService: PosKasirService) {}

  @Post()
  create(@Body() createPosKasirDto: CreatePosKasirDto) {
    return this.posKasirService.create(createPosKasirDto);
  }

  @Get()
  findAll() {
    return this.posKasirService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.posKasirService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePosKasirDto: UpdatePosKasirDto) {
    return this.posKasirService.update(+id, updatePosKasirDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.posKasirService.remove(+id);
  }
}
