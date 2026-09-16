import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserPreferredLanguage1754000000000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "users" ADD "preferredLanguage" character varying(5) NOT NULL DEFAULT 'hu'`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "preferredLanguage"`);
	}
}
