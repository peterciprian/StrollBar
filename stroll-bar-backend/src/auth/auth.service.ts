import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async createToken(email: string) {
    const expiresIn = 6000 * 60;
    const secretOrKey = process.env.JWT_SECRET;
    const user = { email };

    const token = jwt.sign(user, secretOrKey, { audience: 'urn:foo' });

    return { expires_in: expiresIn, token };
  }
  async validateUser(signedUser): Promise<boolean> {
    if (signedUser && signedUser.email) {
      return Boolean(this.usersService.findByEmail(signedUser.email));
    }

    return false;
  }
}
