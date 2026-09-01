import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class EmailVerification1752918000000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		const isPostgres = queryRunner.connection.options.type === 'postgres';

		await queryRunner.addColumns('users', [
			new TableColumn({
				name: 'emailVerified',
				type: 'boolean',
				default: false
			}),
			new TableColumn({
				name: 'emailVerificationTokenHash',
				type: 'varchar',
				length: '255',
				isNullable: true
			}),
			new TableColumn({
				name: 'emailVerificationExpiresAt',
				type: isPostgres ? 'timestamptz' : 'datetime',
				isNullable: true
			})
		]);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropColumn('users', 'emailVerificationExpiresAt');
		await queryRunner.dropColumn('users', 'emailVerificationTokenHash');
		await queryRunner.dropColumn('users', 'emailVerified');
	}
}
