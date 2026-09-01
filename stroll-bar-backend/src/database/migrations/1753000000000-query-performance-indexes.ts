import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class QueryPerformanceIndexes1753000000000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.createIndex(
			'users',
			new TableIndex({
				name: 'IDX_users_active_reset_token_expiry',
				columnNames: ['isActive', 'resetPasswordTokenHash', 'resetPasswordExpiresAt']
			})
		);

		await queryRunner.createIndex(
			'users',
			new TableIndex({
				name: 'IDX_users_active_verification_token_expiry',
				columnNames: ['isActive', 'emailVerified', 'emailVerificationTokenHash', 'emailVerificationExpiresAt']
			})
		);

		await queryRunner.createIndex(
			'strolls',
			new TableIndex({
				name: 'IDX_strolls_publication_listing',
				columnNames: ['activeStatus', 'publicityFlag', 'createdAt']
			})
		);

		await queryRunner.createIndex(
			'strolls',
			new TableIndex({
				name: 'IDX_strolls_author_created_at',
				columnNames: ['authorId', 'createdAt']
			})
		);

		await queryRunner.createIndex(
			'adventures',
			new TableIndex({
				name: 'IDX_adventures_owner_updated_at',
				columnNames: ['ownerUserId', 'updatedAt']
			})
		);

		await queryRunner.createIndex(
			'adventures',
			new TableIndex({
				name: 'IDX_adventures_owner_progress',
				columnNames: ['ownerUserId', 'progressStatus']
			})
		);

		await queryRunner.createIndex(
			'adventures',
			new TableIndex({
				name: 'IDX_adventures_stroll_progress',
				columnNames: ['strollId', 'progressStatus']
			})
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropIndex('users', 'IDX_users_active_reset_token_expiry');
		await queryRunner.dropIndex('users', 'IDX_users_active_verification_token_expiry');
		await queryRunner.dropIndex('strolls', 'IDX_strolls_publication_listing');
		await queryRunner.dropIndex('strolls', 'IDX_strolls_author_created_at');
		await queryRunner.dropIndex('adventures', 'IDX_adventures_owner_updated_at');
		await queryRunner.dropIndex('adventures', 'IDX_adventures_owner_progress');
		await queryRunner.dropIndex('adventures', 'IDX_adventures_stroll_progress');
	}
}
