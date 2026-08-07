import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '../../common/enums/user-status.enum.js';

export class UpdateStatusDto {
  @ApiProperty({
    description: 'Status user',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  @IsNotEmpty({ message: 'Status wajib diisi' })
  @IsEnum(UserStatus, { message: 'Status harus ACTIVE atau INACTIVE' })
  readonly status!: UserStatus;
}
