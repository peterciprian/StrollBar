import { MigrationInterface, QueryRunner, Table, TableColumn, TableIndex } from 'typeorm';

export class StrollReports1753800000000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.addColumn('strolls', new TableColumn({ name: 'reported', type: 'boolean', default: false }));

		await queryRunner.createTable(
			new Table({
				name: 'stroll_reports',
				columns: [
					{ name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
					{ name: 'strollId', type: 'uuid' },
					{ name: 'reporterUserId', type: 'uuid' },
					{ name: 'message', type: 'varchar', length: '300' },
					{ name: 'createdAt', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' }
				]
			})
		);
		await queryRunner.createIndex(
			'stroll_reports',
			new TableIndex({ name: 'IDX_stroll_reports_stroll_created', columnNames: ['strollId', 'createdAt'] })
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropTable('stroll_reports');
		await queryRunner.dropColumn('strolls', 'reported');
	}
}
