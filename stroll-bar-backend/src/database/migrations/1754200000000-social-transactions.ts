import { MigrationInterface, QueryRunner } from 'typeorm';

export class SocialTransactions1754200000000 implements MigrationInterface {
	name = 'SocialTransactions1754200000000';

	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE "social_transactions" (
				"id" varchar(64) PRIMARY KEY,
				"browserChallenge" varchar(43) NOT NULL,
				"expiresAt" timestamptz NOT NULL,
				"callbackConsumed" boolean NOT NULL DEFAULT false,
				"handoffCodeHash" varchar(64),
				"handoffExpiresAt" timestamptz,
				"profile" jsonb,
				"accountAction" jsonb NOT NULL
			)
		`);
		await queryRunner.query('CREATE INDEX "IDX_social_transactions_expiresAt" ON "social_transactions" ("expiresAt")');
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('DROP TABLE "social_transactions"');
	}
}
