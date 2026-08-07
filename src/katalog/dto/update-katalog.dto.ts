import { PartialType } from '@nestjs/mapped-types';
import { CreateKatalogDto } from './create-katalog.dto';

export class UpdateKatalogDto extends PartialType(CreateKatalogDto) {}
