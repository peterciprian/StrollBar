import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserAuthVersion1754100000000 implements MigrationInterface {
	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "users" ADD "authVersion" integer NOT NULL DEFAULT 0`);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "authVersion"`);
	}
}
