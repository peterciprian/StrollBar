import { UserRole } from '../../users/entities/user.entity';

export interface AuthenticatedUser {
	userId: string;
	email: string;
	username: string;
	/** Request-time server snapshot from the current account and paid grants, never a JWT/client role. */
	role: UserRole;
}
