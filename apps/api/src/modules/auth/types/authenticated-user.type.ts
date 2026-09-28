import { Role } from '../../../common/enums/role.enum.js';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: Role;
  tokenVersion: number;
}
