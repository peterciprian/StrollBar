import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class UserRoles1752929000000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.addColumn(
			'users',
			new TableColumn({
				name: 'role',
				type: 'varchar',
				length: '20',
				default: "'simple'"
			})
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropColumn('users', 'role');
	}
}
