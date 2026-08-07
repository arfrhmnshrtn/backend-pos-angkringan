import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Role } from '../../common/enums/role.enum.js';
import { BCRYPT_SALT_ROUNDS } from '../../common/constants/index.js';
import type { CreateUserDto } from '../dto/create-user.dto.js';
import type { UpdateUserDto } from '../dto/update-user.dto.js';
import type { UpdateStatusDto } from '../dto/update-status.dto.js';
import type { ResetPinDto } from '../dto/reset-pin.dto.js';

export interface UserResponse {
  readonly id: number;
  readonly fullname: string;
  readonly role: string;
  readonly status: string;
  readonly created_at: Date;
  readonly updated_at: Date;
}

const USER_SELECT = {
  id: true,
  fullname: true,
  role: true,
  status: true,
  created_at: true,
  updated_at: true,
} as const;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<{ message: string; data: UserResponse[] }> {
    const users = await this.prisma.user.findMany({
      where: { deleted_at: null },
      select: USER_SELECT,
      orderBy: { created_at: 'desc' },
    });

    return {
      message: 'Daftar user berhasil diambil',
      data: users,
    };
  }

  async findOne(id: number): Promise<{ message: string; data: UserResponse }> {
    const user = await this.prisma.user.findFirst({
      where: { id, deleted_at: null },
      select: USER_SELECT,
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    return {
      message: 'Detail user berhasil diambil',
      data: user,
    };
  }

  async create(
    createUserDto: CreateUserDto,
    currentUserRole: Role,
  ): Promise<{ message: string; data: UserResponse }> {
    // Only OWNER can create users
    if (currentUserRole !== Role.OWNER) {
      throw new ForbiddenException('Hanya owner yang bisa membuat akun');
    }

    // Hash PIN
    const hashedPin = await bcrypt.hash(createUserDto.pin, BCRYPT_SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        fullname: createUserDto.fullname,
        pin: hashedPin,
        role: createUserDto.role,
      },
      select: USER_SELECT,
    });

    this.logger.log(`User ${user.fullname} berhasil dibuat oleh owner`);

    return {
      message: 'User berhasil dibuat',
      data: user,
    };
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    currentUserRole: Role,
  ): Promise<{ message: string; data: UserResponse }> {
    if (currentUserRole !== Role.OWNER) {
      throw new ForbiddenException('Hanya owner yang bisa mengubah data user');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { id, deleted_at: null },
    });

    if (!existingUser) {
      throw new NotFoundException('User tidak ditemukan');
    }

    // Prevent editing owner
    if (existingUser.role === 'OWNER') {
      throw new ForbiddenException('Tidak bisa mengubah data owner melalui endpoint ini');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { fullname: updateUserDto.fullname },
      select: USER_SELECT,
    });

    this.logger.log(`User ${id} berhasil diperbarui`);

    return {
      message: 'User berhasil diperbarui',
      data: user,
    };
  }

  async updateStatus(
    id: number,
    updateStatusDto: UpdateStatusDto,
    currentUserRole: Role,
  ): Promise<{ message: string; data: UserResponse }> {
    if (currentUserRole !== Role.OWNER) {
      throw new ForbiddenException('Hanya owner yang bisa mengubah status user');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { id, deleted_at: null },
    });

    if (!existingUser) {
      throw new NotFoundException('User tidak ditemukan');
    }

    if (existingUser.role === 'OWNER') {
      throw new ForbiddenException('Tidak bisa mengubah status owner');
    }

    if (existingUser.status === updateStatusDto.status) {
      throw new ConflictException(`User sudah berstatus ${updateStatusDto.status}`);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { status: updateStatusDto.status },
      select: USER_SELECT,
    });

    this.logger.log(`Status user ${id} diubah menjadi ${updateStatusDto.status}`);

    return {
      message: `Status user berhasil diubah menjadi ${updateStatusDto.status}`,
      data: user,
    };
  }

  async resetPin(
    id: number,
    resetPinDto: ResetPinDto,
    currentUserRole: Role,
  ): Promise<{ message: string; data: null }> {
    if (currentUserRole !== Role.OWNER) {
      throw new ForbiddenException('Hanya owner yang bisa mereset PIN');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { id, deleted_at: null },
    });

    if (!existingUser) {
      throw new NotFoundException('User tidak ditemukan');
    }

    if (existingUser.role === 'OWNER') {
      throw new ForbiddenException('Gunakan endpoint change-pin untuk mengubah PIN owner');
    }

    const hashedPin = await bcrypt.hash(resetPinDto.newPin, BCRYPT_SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id },
      data: { pin: hashedPin },
    });

    // Revoke all refresh tokens for this user (security measure)
    await this.prisma.refresh_token.deleteMany({
      where: { user_id: id },
    });

    this.logger.log(`PIN user ${id} direset oleh owner`);

    return {
      message: 'PIN berhasil direset',
      data: null,
    };
  }

  async remove(
    id: number,
    currentUserRole: Role,
  ): Promise<{ message: string; data: null }> {
    if (currentUserRole !== Role.OWNER) {
      throw new ForbiddenException('Hanya owner yang bisa menghapus user');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { id, deleted_at: null },
    });

    if (!existingUser) {
      throw new NotFoundException('User tidak ditemukan');
    }

    if (existingUser.role === 'OWNER') {
      throw new ForbiddenException('Tidak bisa menghapus akun owner');
    }

    // Soft delete
    await this.prisma.user.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    // Revoke all refresh tokens
    await this.prisma.refresh_token.deleteMany({
      where: { user_id: id },
    });

    this.logger.log(`User ${id} berhasil dihapus (soft delete)`);

    return {
      message: 'User berhasil dihapus',
      data: null,
    };
  }

  async findKasirList(): Promise<{ message: string; data: Pick<UserResponse, 'id' | 'fullname' | 'status'>[] }> {
    const kasirList = await this.prisma.user.findMany({
      where: {
        role: 'KASIR',
        deleted_at: null,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        fullname: true,
        status: true,
      },
      orderBy: { fullname: 'asc' },
    });

    return {
      message: 'Daftar kasir berhasil diambil',
      data: kasirList,
    };
  }
}
