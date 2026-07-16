import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async createToken(email: string) {
    const expiresIn = 6000 * 60;
    const user = { email };

    const token = await this.jwtService.signAsync(user);

    return { expires_in: expiresIn, token };
  }
  async validateUser(signedUser): Promise<boolean> {
    if (!signedUser?.email) {
      return false;
    }

    try {
      await this.usersService.findByEmail(signedUser.email);
      return true;
    } catch (error) {
      if (error instanceof NotFoundException) {
        return false;
      }

      throw error;
    }
  }
}
