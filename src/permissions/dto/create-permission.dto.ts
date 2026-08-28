import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({
    description: 'Nama permission unik (disarankan format nama.aksi, misal kasir.read)',
    example: 'custom.feature.read',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;
}
