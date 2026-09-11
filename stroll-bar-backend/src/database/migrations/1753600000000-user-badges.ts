import { MigrationInterface, QueryRunner, Table, TableIndex, TableUnique } from 'typeorm';

export class UserBadges1753600000000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.createTable(
			new Table({
				name: 'user_badges',
				columns: [
					{ name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
					{ name: 'userId', type: 'uuid' },
					{ name: 'badgeCode', type: 'varchar', length: '64' },
					{ name: 'earnedAt', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' }
				]
			})
		);
		await queryRunner.createUniqueConstraint(
			'user_badges',
			new TableUnique({ name: 'UQ_user_badges_user_code', columnNames: ['userId', 'badgeCode'] })
		);
		await queryRunner.createIndex('user_badges', new TableIndex({ name: 'IDX_user_badges_user_earned', columnNames: ['userId', 'earnedAt'] }));
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropTable('user_badges');
	}
}
