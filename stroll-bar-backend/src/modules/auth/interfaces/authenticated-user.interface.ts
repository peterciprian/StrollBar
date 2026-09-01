import { UserRole } from '../../users/entities/user.entity';

export interface AuthenticatedUser {
	userId: string;
	email: string;
	username: string;
	role: UserRole;
}
