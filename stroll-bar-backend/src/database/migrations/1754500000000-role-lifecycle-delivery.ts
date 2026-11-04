import { MigrationInterface, QueryRunner } from 'typeorm';

export class RoleLifecycleDelivery1754500000000 implements MigrationInterface {
	name = 'RoleLifecycleDelivery1754500000000';

	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "paid_grants" ADD COLUMN "cancelledAt" timestamptz;
			ALTER TABLE "role_lifecycle_outbox"
				DROP CONSTRAINT "role_lifecycle_outbox_eventType_check",
				DROP CONSTRAINT "role_lifecycle_outbox_status_check",
				ADD CHECK ("eventType" IN ('paid_grant_expiry', 'paid_grant_cancelled')),
				ADD CHECK ("status" IN ('pending', 'processing', 'sent', 'quarantined', 'skipped')),
				ADD COLUMN "leaseToken" uuid,
				ADD COLUMN "leaseUntil" timestamptz,
				ADD COLUMN "message" jsonb;
			CREATE INDEX "IDX_role_lifecycle_outbox_lease" ON "role_lifecycle_outbox" ("leaseUntil") WHERE "status" = 'processing';
			INSERT INTO "role_lifecycle_outbox" ("eventType", "userId", "grantId", "availableAt")
				SELECT 'paid_grant_expiry', "userId", "id", "expiresAt"
				FROM "paid_grants" WHERE "status" IN ('active', 'cancelled')
				ON CONFLICT ("eventType", "grantId") DO NOTHING;
		`);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const [usage] = await queryRunner.query(`SELECT
			(SELECT count(*) FROM "role_lifecycle_outbox") + (SELECT count(*) FROM "paid_grants" WHERE "cancelledAt" IS NOT NULL) AS count`);
		if (Number(usage.count)) throw new Error('ROLE-04 contains durable event history. Preserve it; use a forward migration.');
		await queryRunner.query(`
			DROP INDEX "IDX_role_lifecycle_outbox_lease";
			ALTER TABLE "role_lifecycle_outbox"
				DROP CONSTRAINT "role_lifecycle_outbox_eventType_check",
				DROP CONSTRAINT "role_lifecycle_outbox_status_check",
				ADD CHECK ("eventType" IN ('paid_grant_expiry')),
				ADD CHECK ("status" IN ('pending', 'processing', 'sent', 'quarantined')),
				DROP COLUMN "leaseToken", DROP COLUMN "leaseUntil", DROP COLUMN "message";
			ALTER TABLE "paid_grants" DROP COLUMN "cancelledAt";
		`);
	}
}
