import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class SocialAuthIdentities1752907000000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		const isPostgres = queryRunner.connection.options.type === 'postgres';
		const idType = isPostgres ? 'uuid' : 'varchar';
		const dateType = isPostgres ? 'timestamptz' : 'datetime';

		await queryRunner.createTable(
			new Table({
				name: 'social_auth_identities',
				columns: [
					{ name: 'id', type: idType, isPrimary: true },
					{ name: 'provider', type: 'varchar', length: '32' },
					{ name: 'providerUserId', type: 'varchar', length: '255' },
					{ name: 'userId', type: idType },
					{ name: 'email', type: 'varchar', length: '255', isNullable: true },
					{ name: 'createdAt', type: dateType, default: 'CURRENT_TIMESTAMP' },
					{ name: 'updatedAt', type: dateType, default: 'CURRENT_TIMESTAMP' }
				]
			})
		);

		await queryRunner.createIndex(
			'social_auth_identities',
			new TableIndex({
				name: 'IDX_social_auth_provider_subject',
				columnNames: ['provider', 'providerUserId'],
				isUnique: true
			})
		);

		await queryRunner.createForeignKey(
			'social_auth_identities',
			new TableForeignKey({
				columnNames: ['userId'],
				referencedTableName: 'users',
				referencedColumnNames: ['id'],
				onDelete: 'CASCADE'
			})
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropTable('social_auth_identities');
	}
}
