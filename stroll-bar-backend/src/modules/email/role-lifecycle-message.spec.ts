import { buildRoleLifecycleMessage } from './role-lifecycle-message';
import { PaidPlan } from '../users/entities/paid-grant.entity';
import { RoleLifecycleEventType } from '../users/entities/role-lifecycle-outbox.entity';
import { PreferredLanguage, UserRole } from '../users/entities/user.entity';

describe('ROLE-04 localized lifecycle messages', () => {
	it.each([PreferredLanguage.EN, PreferredLanguage.HU])('includes cancellation plan, UTC times, fallback and retention in %s', (language) => {
		const result = buildRoleLifecycleMessage({
			recipient: 'walker@example.invalid',
			username: '<Walker & Co>',
			language,
			eventType: RoleLifecycleEventType.PAID_GRANT_CANCELLED,
			plan: PaidPlan.PREMIUM,
			eventAt: new Date('2026-10-25T01:30:00Z'),
			expiresAt: new Date('2026-11-25T01:30:00Z'),
			effectivePlanAfterExpiry: UserRole.CREATOR
		});
		for (const content of [result.textContent, result.htmlContent]) {
			for (const value of ['PREMIUM', 'CREATOR', 'SIMPLE', 'ADMIN', '2026-10-25T01:30:00.000Z', '2026-11-25T01:30:00.000Z', 'UTC']) {
				expect(content).toContain(value);
			}
		}
		expect(result.htmlContent).toContain('&lt;Walker &amp; Co&gt;');
		expect(result.htmlContent).not.toContain('<Walker');
		expect(result.textContent).toContain(
			language === PreferredLanguage.HU ? 'megvásárolt tartalmaid megmaradnak' : 'purchased content are retained'
		);
		expect(result.subject).toContain(language === PreferredLanguage.HU ? 'lemondva' : 'cancelled');
	});

	it.each([UserRole.SIMPLE, UserRole.CREATOR, UserRole.PREMIUM, UserRole.ADMIN])(
		'expiry names the grant without falsely removing %s access',
		(plan) => {
			const result = buildRoleLifecycleMessage({
				recipient: 'walker@example.invalid',
				username: 'Walker',
				language: PreferredLanguage.EN,
				eventType: RoleLifecycleEventType.PAID_GRANT_EXPIRY,
				plan: PaidPlan.CREATOR,
				eventAt: new Date('2026-11-04T00:00:00Z'),
				expiresAt: new Date('2026-11-04T00:00:00Z'),
				effectivePlanAfterExpiry: plan
			});
			expect(result.subject).toContain('CREATOR expired');
			expect(result.textContent).toContain(`currently recorded grants: ${plan.toUpperCase()}`);
			expect(result.textContent).toContain('owned strolls');
			expect(result.textContent).not.toContain('was cancelled');
		}
	);
});
