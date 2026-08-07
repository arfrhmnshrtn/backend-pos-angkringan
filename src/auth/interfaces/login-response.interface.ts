import type { Role } from '../../common/enums/role.enum.js';

export interface LoginResponse {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
  readonly role: Role;
  readonly permissions: string[];
  readonly user: {
    readonly id: number;
    readonly fullname: string;
    readonly role: Role;
    readonly status: string;
  };
}
