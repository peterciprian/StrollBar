import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UserEntity, UserRole } from '../../users/entities/user.entity';
import { JwtStrategy } from './jwt.strategy';

describe('JWT session invalidation', () => {
	const findOne = jest.fn();
	const strategy = new JwtStrategy(
		{ getOrThrow: () => 'test-secret' } as unknown as ConfigService,
		{ findOne } as unknown as Repository<UserEntity>
	);
	beforeEach(() => findOne.mockReset());

	it('rejects sessions issued before a reset', async () => {
		findOne.mockResolvedValue({ authVersion: 1 });
		await expect(strategy.validate({ sub: 'user-1', email: 'a@example.com', username: 'old', authVersion: 0 })).rejects.toThrow(UnauthorizedException);
	});

	it('rejects missing or inactive accounts', async () => {
		findOne.mockResolvedValue(null);
		await expect(strategy.validate({ sub: 'user-1', email: 'a@example.com', username: 'old' })).rejects.toThrow(UnauthorizedException);
		expect(findOne).toHaveBeenCalledWith({ where: { id: 'user-1', isActive: true } });
	});

	it('accepts version-zero legacy sessions before a reset and uses current DB identity', async () => {
		findOne.mockResolvedValue({ authVersion: 0, email: 'new@example.com', username: 'new', role: UserRole.SIMPLE });
		await expect(strategy.validate({ sub: 'user-1', email: 'old@example.com', username: 'old' })).resolves.toEqual({
			userId: 'user-1', email: 'new@example.com', username: 'new', role: UserRole.SIMPLE
		});
	});
});
