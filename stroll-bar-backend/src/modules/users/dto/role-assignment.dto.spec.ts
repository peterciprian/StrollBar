import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePaidGrantDto } from './create-paid-grant.dto';
import { UpdateUserRoleDto } from './update-user-role.dto';
import { UserRole } from '../entities/user.entity';

describe('role assignment request contracts', () => {
	it('allows only independent ADMIN assignment/removal in the legacy role endpoint', async () => {
		for (const role of [UserRole.SIMPLE, UserRole.ADMIN]) {
			expect(await validate(plainToInstance(UpdateUserRoleDto, { role }))).toHaveLength(0);
		}
		for (const role of [UserRole.CREATOR, UserRole.PREMIUM]) {
			expect(await validate(plainToInstance(UpdateUserRoleDto, { role }))).not.toHaveLength(0);
		}
	});

	it('requires an explicit paid plan, UTC start/end and audit reason', async () => {
		const valid = { plan: 'creator', startsAt: '2026-01-01T00:00:00Z', expiresAt: '2027-01-01T00:00:00Z', reason: 'Approved' };
		expect(await validate(plainToInstance(CreatePaidGrantDto, valid))).toHaveLength(0);
		for (const invalid of [
			{ ...valid, plan: 'admin' }, { ...valid, expiresAt: undefined }, { ...valid, startsAt: '2026-01-01' },
			{ ...valid, expiresAt: 'infinity' }, { ...valid, reason: '' }
		]) {
			expect(await validate(plainToInstance(CreatePaidGrantDto, invalid))).not.toHaveLength(0);
		}
	});
});
