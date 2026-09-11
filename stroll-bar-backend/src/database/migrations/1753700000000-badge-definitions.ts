import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';
import { BADGE_SEED_DATA } from '../../modules/badges/badge-seed-data';

export class BadgeDefinitions1753700000000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.createTable(
			new Table({
				name: 'badge_definitions',
				columns: [
					{ name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
					{ name: 'code', type: 'varchar', length: '64', isUnique: true },
					{ name: 'icon', type: 'varchar', length: '64' },
					{ name: 'title', type: 'varchar', length: '150' },
					{ name: 'description', type: 'text' },
					{ name: 'active', type: 'boolean', default: true },
					{ name: 'rules', type: 'jsonb' },
					{ name: 'createdAt', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
					{ name: 'updatedAt', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' }
				]
			})
		);
		await queryRunner.createIndex('badge_definitions', new TableIndex({ name: 'IDX_badge_definitions_active', columnNames: ['active'] }));

		for (const badge of BADGE_SEED_DATA) {
			await queryRunner.query(`INSERT INTO badge_definitions (code, icon, title, description, rules) VALUES ($1, $2, $3, $4, $5::jsonb)`, [
				badge.code,
				badge.icon,
				badge.title,
				badge.description,
				JSON.stringify(badge.rules)
			]);
		}
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropTable('badge_definitions');
	}
}
