import { PartialType } from '@nestjs/swagger';
import { CreateWasteDto } from './create-waste.dto.js';

export class UpdateWasteDto extends PartialType(CreateWasteDto) {}
