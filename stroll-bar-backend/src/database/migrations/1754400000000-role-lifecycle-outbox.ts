import { MigrationInterface, QueryRunner } from 'typeorm';

export class RoleLifecycleOutbox1754400000000 implements MigrationInterface {
	name = 'RoleLifecycleOutbox1754400000000';

	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE "role_lifecycle_outbox" (
				"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
				"eventType" varchar(40) NOT NULL CHECK ("eventType" IN ('paid_grant_expiry')),
				"userId" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
				"grantId" uuid NOT NULL REFERENCES "paid_grants"("id") ON DELETE RESTRICT,
				"availableAt" timestamptz NOT NULL,
				"status" varchar(20) NOT NULL DEFAULT 'pending'
					CHECK ("status" IN ('pending', 'processing', 'sent', 'quarantined')),
				"attemptCount" integer NOT NULL DEFAULT 0 CHECK ("attemptCount" >= 0),
				"lastError" text,
				"lastAttemptAt" timestamptz,
				"sentAt" timestamptz,
				"createdAt" timestamptz NOT NULL DEFAULT now(),
				"updatedAt" timestamptz NOT NULL DEFAULT now(),
				CHECK (isfinite("availableAt"))
			)
		`);
		await queryRunner.query(`CREATE UNIQUE INDEX "IDX_role_lifecycle_outbox_event_grant" ON "role_lifecycle_outbox" ("eventType", "grantId")`);
		await queryRunner.query(`CREATE INDEX "IDX_role_lifecycle_outbox_due" ON "role_lifecycle_outbox" ("status", "availableAt")`);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const [usage] = await queryRunner.query(`SELECT count(*) FROM "role_lifecycle_outbox"`);
		if (Number(usage.count) !== 0) {
			throw new Error('ROLE-04 lifecycle outbox contains durable event history. Preserve it; do not roll back this migration.');
		}
		await queryRunner.query('DROP TABLE "role_lifecycle_outbox"');
	}
}
