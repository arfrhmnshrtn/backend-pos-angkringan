import { Injectable } from '@nestjs/common';
import { CreatePosKasirDto } from './dto/create-pos_kasir.dto';
import { UpdatePosKasirDto } from './dto/update-pos_kasir.dto';

@Injectable()
export class PosKasirService {
  create(createPosKasirDto: CreatePosKasirDto) {
    return 'This action adds a new posKasir';
  }

  findAll() {
    return `This action returns all posKasir`;
  }

  findOne(id: number) {
    return `This action returns a #${id} posKasir`;
  }

  update(id: number, updatePosKasirDto: UpdatePosKasirDto) {
    return `This action updates a #${id} posKasir`;
  }

  remove(id: number) {
    return `This action removes a #${id} posKasir`;
  }
}
