import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  role: Role;
  type: 'access' | 'refresh';
}

export interface AuthUser {
  id: string;
  role: Role;
  email: string;
  nameEn: string;
}
