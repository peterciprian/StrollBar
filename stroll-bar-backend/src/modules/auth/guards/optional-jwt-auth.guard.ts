import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
	handleRequest<TUser>(error: Error | null, user: TUser | false | null): TUser | null {
		if (error || !user) {
			return null;
		}

		return user;
	}
}
