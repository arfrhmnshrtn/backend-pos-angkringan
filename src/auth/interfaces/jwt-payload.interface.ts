import type { Role } from '../../common/enums/role.enum.js';

export interface JwtPayload {
  readonly id: number;
  readonly fullname: string;
  readonly role: Role;
  readonly permissions: string[];
}
