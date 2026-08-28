import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class UpdatePermissionDto {
  @ApiProperty({
    description: 'Nama permission baru',
    example: 'custom.feature.write',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;
}
