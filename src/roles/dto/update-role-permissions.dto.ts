import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber } from 'class-validator';

export class UpdateRolePermissionsDto {
  @ApiProperty({
    description: 'Array ID permission yang akan diberikan ke role',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  permissionIds: number[];
}
