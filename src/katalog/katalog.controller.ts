import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { KatalogService } from './katalog.service';
import { CreateKatalogDto } from './dto/create-katalog.dto';
import { UpdateKatalogDto } from './dto/update-katalog.dto';

@Controller('katalog')
export class KatalogController {
  constructor(private readonly katalogService: KatalogService) {}

  @Post()
  create(@Body() createKatalogDto: CreateKatalogDto) {
    return this.katalogService.create(createKatalogDto);
  }

  @Get()
  findAll() {
    return this.katalogService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.katalogService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateKatalogDto: UpdateKatalogDto) {
    return this.katalogService.update(+id, updateKatalogDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.katalogService.remove(+id);
  }
}
