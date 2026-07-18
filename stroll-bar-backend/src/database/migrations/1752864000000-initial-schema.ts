import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class InitialSchema1752864000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    const idType = isPostgres ? 'uuid' : 'varchar';
    const dateType = isPostgres ? 'timestamptz' : 'datetime';
    const mediaType = isPostgres ? 'jsonb' : 'text';
    const floatType = isPostgres ? 'double precision' : 'float';
    const booleanDefault = isPostgres ? 'true' : '1';

    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          { name: 'id', type: idType, isPrimary: true },
          { name: 'username', type: 'varchar', length: '50', isUnique: true },
          { name: 'email', type: 'varchar', length: '255', isUnique: true },
          { name: 'passwordHash', type: 'varchar', length: '255' },
          { name: 'profileImageUrl', type: 'varchar', length: '2048', isNullable: true },
          { name: 'isActive', type: 'boolean', default: booleanDefault },
          { name: 'createdAt', type: dateType, default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: dateType, default: 'CURRENT_TIMESTAMP' },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'strolls',
        columns: [
          { name: 'id', type: idType, isPrimary: true },
          { name: 'name', type: 'varchar', length: '150' },
          { name: 'authorId', type: idType },
          { name: 'activeStatus', type: 'varchar', default: "'draft'" },
          { name: 'labels', type: 'text', default: "''" },
          { name: 'description', type: 'text' },
          { name: 'proposerText', type: 'text', isNullable: true },
          { name: 'mediaUrls', type: mediaType, isNullable: true },
          { name: 'publicityFlag', type: 'varchar', default: "'private'" },
          { name: 'stageCount', type: 'integer', default: '0' },
          { name: 'createdAt', type: dateType, default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: dateType, default: 'CURRENT_TIMESTAMP' },
        ],
        foreignKeys: [
          {
            columnNames: ['authorId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'stages',
        columns: [
          { name: 'id', type: idType, isPrimary: true },
          { name: 'strollId', type: idType },
          { name: 'orderIndex', type: 'integer' },
          { name: 'name', type: 'varchar', length: '150' },
          { name: 'description', type: 'text' },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'imageUrls', type: 'text', default: "''" },
          { name: 'videoUrls', type: 'text', default: "''" },
          { name: 'address', type: 'varchar', length: '255', isNullable: true },
          { name: 'latitude', type: floatType, isNullable: true },
          { name: 'longitude', type: floatType, isNullable: true },
          { name: 'riddleAnswer', type: 'varchar', length: '255', isNullable: true },
          { name: 'createdAt', type: dateType, default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: dateType, default: 'CURRENT_TIMESTAMP' },
        ],
        foreignKeys: [
          {
            columnNames: ['strollId'],
            referencedTableName: 'strolls',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'stages',
      new TableIndex({
        name: 'IDX_stages_stroll_order',
        columnNames: ['strollId', 'orderIndex'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'adventures',
        columns: [
          { name: 'id', type: idType, isPrimary: true },
          { name: 'ownerUserId', type: idType },
          { name: 'strollId', type: idType },
          { name: 'purchaseTime', type: dateType },
          { name: 'startDateTime', type: dateType, isNullable: true },
          { name: 'completionDateTime', type: dateType, isNullable: true },
          { name: 'progressStatus', type: 'varchar', default: "'purchased'" },
          { name: 'currentStageIndex', type: 'integer', default: '1' },
          { name: 'createdAt', type: dateType, default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: dateType, default: 'CURRENT_TIMESTAMP' },
        ],
        foreignKeys: [
          {
            columnNames: ['ownerUserId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['strollId'],
            referencedTableName: 'strolls',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'stage_attempts',
        columns: [
          { name: 'id', type: idType, isPrimary: true },
          { name: 'adventureId', type: idType },
          { name: 'stageId', type: idType },
          { name: 'providedAnswer', type: 'varchar', length: '255' },
          { name: 'isCorrect', type: 'boolean' },
          { name: 'attemptedAt', type: dateType, default: 'CURRENT_TIMESTAMP' },
        ],
        foreignKeys: [
          {
            columnNames: ['adventureId'],
            referencedTableName: 'adventures',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['stageId'],
            referencedTableName: 'stages',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('stage_attempts');
    await queryRunner.dropTable('adventures');
    await queryRunner.dropIndex('stages', 'IDX_stages_stroll_order');
    await queryRunner.dropTable('stages');
    await queryRunner.dropTable('strolls');
    await queryRunner.dropTable('users');
  }
}
