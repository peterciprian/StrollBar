import { MigrationInterface, QueryRunner, Table, TableColumn, TableIndex } from 'typeorm';

export class StrollReviews1753400000000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.createTable(
			new Table({
				name: 'stroll_reviews',
				columns: [
					{ name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
					{ name: 'strollId', type: 'uuid' },
					{ name: 'userId', type: 'uuid' },
					{ name: 'adventureId', type: 'uuid' },
					{ name: 'rating', type: 'int' },
					{ name: 'comment', type: 'text', isNullable: true },
					{ name: 'createdAt', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
					{ name: 'updatedAt', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' }
				]
			})
		);
		await queryRunner.createIndex(
			'stroll_reviews',
			new TableIndex({ name: 'IDX_stroll_reviews_stroll_created', columnNames: ['strollId', 'createdAt'] })
		);
		await queryRunner.createIndex(
			'stroll_reviews',
			new TableIndex({ name: 'IDX_stroll_reviews_stroll_user', columnNames: ['strollId', 'userId'], isUnique: true })
		);
		await queryRunner.addColumns('strolls', [
			new TableColumn({ name: 'ratingAverage', type: 'double precision', default: 0 }),
			new TableColumn({ name: 'ratingCount', type: 'int', default: 0 })
		]);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropColumns('strolls', ['ratingAverage', 'ratingCount']);
		await queryRunner.dropTable('stroll_reviews');
	}
}
