import { MigrationInterface, QueryRunner } from 'typeorm';

export class PaidGrants1754300000000 implements MigrationInterface {
	name = 'PaidGrants1754300000000';

	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "strolls" ALTER COLUMN "publicityFlag" SET DEFAULT 'public'`);
		await queryRunner.query(`
			CREATE TABLE "paid_grants" (
				"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
				"userId" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
				"plan" varchar(20) NOT NULL CHECK ("plan" IN ('creator', 'premium')),
				"status" varchar(20) NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'cancelled', 'suspended', 'revoked')),
				"startsAt" timestamptz NOT NULL,
				"expiresAt" timestamptz NOT NULL,
				"source" varchar(32) NOT NULL DEFAULT 'manual' CHECK ("source" IN ('manual', 'legacy_recovery')),
				"actorUserId" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
				"reason" text NOT NULL CHECK (length(trim("reason")) > 0),
				"createdAt" timestamptz NOT NULL DEFAULT now(),
				CHECK (isfinite("startsAt") AND isfinite("expiresAt") AND "expiresAt" > "startsAt")
			)
		`);
		await queryRunner.query(`CREATE INDEX "IDX_paid_grants_user_period" ON "paid_grants" ("userId", "startsAt", "expiresAt")`);
		await queryRunner.query(`
			CREATE TABLE "legacy_role_cutovers" (
				"userId" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE RESTRICT,
				"previousRole" varchar(20) NOT NULL CHECK ("previousRole" IN ('creator', 'premium')),
				"noticeAt" timestamptz NOT NULL DEFAULT now(),
				"cutoverAt" timestamptz NOT NULL,
				"completedAt" timestamptz,
				"actorUserId" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
				"noticeReference" text NOT NULL CHECK (length(trim("noticeReference")) > 0),
				CHECK (isfinite("noticeAt") AND isfinite("cutoverAt") AND "cutoverAt" >= "noticeAt" + interval '168 hours')
			)
		`);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const [usage] = await queryRunner.query(`SELECT
			(SELECT count(*) FROM "paid_grants") + (SELECT count(*) FROM "legacy_role_cutovers") AS count`);
		if (Number(usage.count) !== 0) {
			throw new Error('ROLE-01 contains grant/notice history. Preserve it; use controlled recovery, not schema rollback.');
		}
		await queryRunner.query('DROP TABLE "legacy_role_cutovers"');
		await queryRunner.query('DROP TABLE "paid_grants"');
		await queryRunner.query(`ALTER TABLE "strolls" ALTER COLUMN "publicityFlag" SET DEFAULT 'private'`);
	}
}
