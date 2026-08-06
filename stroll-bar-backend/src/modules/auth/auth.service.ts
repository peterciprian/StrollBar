import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { StringValue } from 'ms';
import { Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserEntity } from '../users/entities/user.entity';

type SafeUser = Pick<
  UserEntity,
  'id' | 'username' | 'email' | 'profileImageUrl' | 'isActive' | 'createdAt' | 'updatedAt'
>;
type AuthResponse = { accessToken: string; refreshToken: string; user: SafeUser };

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existingUser = await this.usersRepository.findOne({
      where: [{ email: dto.email }, { username: dto.username }],
    });

    if (existingUser) {
      throw new ConflictException('User with the same email or username already exists.');
    }

    const user = this.usersRepository.create({
      username: dto.username,
      email: dto.email,
      passwordHash: this.hashPassword(dto.password),
      isActive: true,
    });

    const savedUser = await this.usersRepository.save(user);
    const tokens = await this.issueTokens(savedUser);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.sanitizeUser(savedUser),
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersRepository.findOne({ where: { email: dto.email } });

    if (!user || !this.verifyPassword(dto.password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const tokens = await this.issueTokens(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const payload = await this.jwtService.verifyAsync<{ sub: string; email: string; username: string }>(refreshToken, {
      secret: this.getRefreshSecret(),
    });
    const user = await this.usersRepository.findOne({ where: { id: payload.sub, isActive: true } });

    if (!user || !user.refreshTokenHash || !this.verifyPassword(refreshToken, user.refreshTokenHash)) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const tokens = await this.issueTokens(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async logout(userId: string, refreshToken?: string): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({ where: { id: userId, isActive: true } });

    if (!user) {
      throw new NotFoundException('No active user found.');
    }

    if (refreshToken && user.refreshTokenHash && !this.verifyPassword(refreshToken, user.refreshTokenHash)) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    user.refreshTokenHash = null;
    await this.usersRepository.save(user);

    return { message: 'Logged out successfully.' };
  }

  async requestPasswordReset(email: string): Promise<{ message: string; resetToken?: string }> {
    const user = await this.usersRepository.findOne({ where: { email } });

    if (!user) {
      return { message: 'If the account exists, a password reset token has been issued.' };
    }

    const resetToken = randomBytes(32).toString('hex');
    const ttlMinutes = Number(this.configService.get<string>('PASSWORD_RESET_TOKEN_TTL_MINUTES') ?? '15');

    user.resetPasswordTokenHash = this.hashPassword(resetToken);
    user.resetPasswordExpiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    await this.usersRepository.save(user);

    const shouldExposeResetToken =
      (this.configService.get<string>('AUTH_EXPOSE_RESET_TOKEN') ?? 'false').toLowerCase() === 'true';

    return {
      message: 'If the account exists, a password reset token has been issued.',
      ...(shouldExposeResetToken ? { resetToken } : {}),
    };
  }

  async resetPassword(resetToken: string, newPassword: string): Promise<{ message: string }> {
    const users = await this.usersRepository.find({ where: { isActive: true } });
    const user = users.find(
      (candidate) =>
        !!candidate.resetPasswordTokenHash &&
        !!candidate.resetPasswordExpiresAt &&
        candidate.resetPasswordExpiresAt.getTime() > Date.now() &&
        this.verifyPassword(resetToken, candidate.resetPasswordTokenHash),
    );

    if (!user) {
      throw new UnauthorizedException('Invalid or expired password reset token.');
    }

    user.passwordHash = this.hashPassword(newPassword);
    user.refreshTokenHash = null;
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpiresAt = null;
    await this.usersRepository.save(user);

    return { message: 'Password updated successfully.' };
  }

  async me(userId: string): Promise<SafeUser> {
    const user = await this.usersRepository.findOne({ where: { id: userId, isActive: true } });

    if (!user) {
      throw new NotFoundException('No active user found. Register or log in first.');
    }

    return this.sanitizeUser(user);
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, storedValue: string): boolean {
    const [salt, expectedHash] = storedValue.split(':');

    if (!salt || !expectedHash) {
      return false;
    }

    const actualHash = scryptSync(password, salt, 64).toString('hex');
    return timingSafeEqual(Buffer.from(actualHash, 'hex'), Buffer.from(expectedHash, 'hex'));
  }

  private createAccessToken(user: UserEntity): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      username: user.username,
    });
  }

  private createRefreshToken(user: UserEntity): string {
    return this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        username: user.username,
      },
      {
        secret: this.getRefreshSecret(),
        expiresIn: (this.configService.get<string>('JWT_REFRESH_TOKEN_TTL') ?? '7d') as StringValue,
      },
    );
  }

  private getRefreshSecret(): string {
    return this.configService.get<string>('JWT_REFRESH_SECRET') ?? 'strollbar-dev-refresh-secret';
  }

  private async issueTokens(user: UserEntity): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.createAccessToken(user);
    const refreshToken = this.createRefreshToken(user);

    user.refreshTokenHash = this.hashPassword(refreshToken);
    await this.usersRepository.save(user);

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: UserEntity): SafeUser {
    const {
      passwordHash: _passwordHash,
      refreshTokenHash: _refreshTokenHash,
      resetPasswordTokenHash: _resetPasswordTokenHash,
      resetPasswordExpiresAt: _resetPasswordExpiresAt,
      ...safeUser
    } = user;
    return safeUser;
  }
}
