import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, JwtPayload } from './types';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return this.issueTokens({
      id: user.id,
      role: user.role,
      email: user.email,
      nameEn: user.nameEn,
    });
  }

  async refresh(user: AuthUser) {
    return this.issueTokens(user);
  }

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 10);
  }

  private issueTokens(user: AuthUser) {
    const accessPayload: JwtPayload = { sub: user.id, role: user.role, type: 'access' };
    const refreshPayload: JwtPayload = { sub: user.id, role: user.role, type: 'refresh' };
    const accessOpts: JwtSignOptions = {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '15m') as unknown as number,
    };
    const refreshOpts: JwtSignOptions = {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d') as unknown as number,
    };
    const accessToken = this.jwt.sign(accessPayload, accessOpts);
    const refreshToken = this.jwt.sign(refreshPayload, refreshOpts);
    return { accessToken, refreshToken, user };
  }
}
