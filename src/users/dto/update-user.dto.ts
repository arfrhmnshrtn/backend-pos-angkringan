import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Nama lengkap',
    example: 'Jane Doe',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Nama lengkap harus berupa string' })
  @MaxLength(100, { message: 'Nama lengkap maksimal 100 karakter' })
  readonly fullname?: string;
}
