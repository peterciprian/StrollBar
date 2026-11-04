import { ForbiddenException } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { AppErrorCode } from '../../common/utils/app-error-code';
import { resolveQuota, RoleQuota, STROLL_CREATION_QUOTAS } from '../../common/utils/user-quotas';
import { UserRole } from '../users/entities/user.entity';
import { StrollEntity, StrollPublicityFlag } from './entities/stroll.entity';

type QuotaCategory = keyof RoleQuota;

function category(publicity: StrollPublicityFlag): QuotaCategory {
	return publicity === StrollPublicityFlag.PUBLIC ? 'public' : 'private';
}

export function assertQuotaTransition(
	before: RoleQuota,
	limits: RoleQuota,
	nextPublicity: StrollPublicityFlag,
	previousPublicity?: StrollPublicityFlag
): void {
	const after = { ...before };
	if (previousPublicity !== undefined) after[category(previousPublicity)] -= 1;
	after[category(nextPublicity)] += 1;
	const categories: QuotaCategory[] = ['public', 'private'];
	const overBefore = categories.map((key) => Math.max(0, before[key] - limits[key]));
	const overAfter = categories.map((key) => Math.max(0, after[key] - limits[key]));
	const worsens = overAfter.some((excess, index) => excess > overBefore[index]);
	const improves = overAfter.some((excess, index) => excess < overBefore[index]);
	const wasOver = overBefore.some((excess) => excess > 0);
	if (worsens || (wasOver && !improves)) {
		throw new ForbiddenException({
			code: limits[category(nextPublicity)] === 0 ? AppErrorCode.STROLL_PUBLICITY_NOT_ALLOWED : AppErrorCode.STROLL_QUOTA_REACHED,
			message: 'Creation quota exceeded. Only deletion or a publicity change that reduces excess without increasing another category is allowed.'
		});
	}
}

export async function assertCreationQuota(
	repository: Repository<StrollEntity>,
	userId: string,
	role: UserRole,
	nextPublicity: StrollPublicityFlag,
	previousPublicity?: StrollPublicityFlag
): Promise<void> {
	const limits = resolveQuota(STROLL_CREATION_QUOTAS, role);
	if (!Number.isFinite(limits.public) && !Number.isFinite(limits.private)) return;
	// No status predicate: drafts, archived and suspended rows consume quota. Deletion is currently hard deletion.
	const [publicCount, privateCount] = await Promise.all([
		repository.count({ where: { authorId: userId, publicityFlag: StrollPublicityFlag.PUBLIC } }),
		repository.count({ where: { authorId: userId, publicityFlag: In([StrollPublicityFlag.PRIVATE, StrollPublicityFlag.UNLISTED]) } })
	]);
	assertQuotaTransition({ public: publicCount, private: privateCount }, limits, nextPublicity, previousPublicity);
}
