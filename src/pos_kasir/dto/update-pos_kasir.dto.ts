import { PartialType } from '@nestjs/mapped-types';
import { CreatePosKasirDto } from './create-pos_kasir.dto';

export class UpdatePosKasirDto extends PartialType(CreatePosKasirDto) {}
