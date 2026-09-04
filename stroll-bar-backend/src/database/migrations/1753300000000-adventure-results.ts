import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AdventureResults1753300000000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.createTable(
			new Table({
				name: 'adventure_results',
				columns: [
					{ name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
					{ name: 'userId', type: 'uuid' },
					{ name: 'strollId', type: 'uuid' },
					{ name: 'adventureId', type: 'uuid', isUnique: true },
					{ name: 'completedStageCount', type: 'int', default: 0 },
					{ name: 'elapsedSeconds', type: 'int', default: 0 },
					{ name: 'routeLengthKm', type: 'double precision', default: 0 },
					{ name: 'completedAt', type: 'timestamptz' },
					{ name: 'createdAt', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' }
				]
			})
		);
		await queryRunner.createIndex(
			'adventure_results',
			new TableIndex({ name: 'IDX_adventure_results_user_stroll', columnNames: ['userId', 'strollId'] })
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropTable('adventure_results');
	}
}
