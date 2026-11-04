import { UserRole, PreferredLanguage } from '../users/entities/user.entity';
import { PaidPlan } from '../users/entities/paid-grant.entity';
import { RoleLifecycleEventType } from '../users/entities/role-lifecycle-outbox.entity';

export interface RoleLifecycleMessageInput {
	recipient: string;
	username: string;
	language: PreferredLanguage;
	eventType: RoleLifecycleEventType;
	plan: PaidPlan;
	eventAt: Date;
	expiresAt: Date;
	effectivePlanAfterExpiry: UserRole;
}

function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

export function buildRoleLifecycleMessage(input: RoleLifecycleMessageInput) {
	const hu = input.language === PreferredLanguage.HU;
	const cancelled = input.eventType === RoleLifecycleEventType.PAID_GRANT_CANCELLED;
	const plan = input.plan.toUpperCase();
	// UTC is explicit and unambiguous in both languages, including DST boundaries.
	const eventAt = input.eventAt.toISOString();
	const expiresAt = input.expiresAt.toISOString();
	const effectivePlan = input.effectivePlanAfterExpiry.toUpperCase();
	const subject = hu ? `StrollBar – ${plan} ${cancelled ? 'lemondva' : 'lejárt'}` : `StrollBar – ${plan} ${cancelled ? 'cancelled' : 'expired'}`;
	const lines = hu
		? [
				`Szia ${input.username}!`,
				cancelled
					? `A(z) ${plan} jogosultság lemondásának időpontja: ${eventAt} (UTC).`
					: `A(z) ${plan} jogosultság lejárt: ${eventAt} (UTC).`,
				...(cancelled ? [`A hozzáférés a lejáratig megmarad: ${expiresAt} (UTC); a lejárat pillanatában megszűnik.`] : []),
				`A lejáratkor érvényes csomagod a jelenleg rögzített jogosultságok alapján: ${effectivePlan}.`,
				'Más aktív fizetős jogosultság vagy külön ADMIN szerep hiányában a csomagod SIMPLE lesz. A lemondás és a lejárat nem módosítja a külön ADMIN szerepet.',
				'A saját sétáid és megvásárolt tartalmaid megmaradnak.'
			]
		: [
				`Hello ${input.username}!`,
				cancelled ? `Your ${plan} grant was cancelled at ${eventAt} (UTC).` : `Your ${plan} grant expired at ${eventAt} (UTC).`,
				...(cancelled ? [`Access remains through ${expiresAt} (UTC) and ends at that exact expiry instant.`] : []),
				`Your effective plan at this grant's expiry, based on currently recorded grants: ${effectivePlan}.`,
				'Without another active paid grant or an independent ADMIN assignment, your plan falls back to SIMPLE. Cancellation and expiry never remove independent ADMIN access.',
				'Your owned strolls and purchased content are retained.'
			];
	return {
		recipient: input.recipient,
		subject,
		textContent: lines.join('\n\n'),
		htmlContent: `<div lang="${hu ? 'hu' : 'en'}">${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('')}</div>`
	};
}
