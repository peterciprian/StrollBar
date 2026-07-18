import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class MediaAssets1752896000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    const idType = isPostgres ? 'uuid' : 'varchar';
    const dateType = isPostgres ? 'timestamptz' : 'datetime';

    await queryRunner.createTable(
      new Table({
        name: 'media_assets',
        columns: [
          { name: 'id', type: idType, isPrimary: true },
          { name: 'uploadedByUserId', type: idType },
          { name: 'strollId', type: idType, isNullable: true },
          { name: 'stageId', type: idType, isNullable: true },
          { name: 'profileUserId', type: idType, isNullable: true },
          { name: 'storageKey', type: 'varchar', length: '512' },
          { name: 'publicUrl', type: 'varchar', length: '2048' },
          { name: 'contentType', type: 'varchar', length: '100' },
          { name: 'sizeBytes', type: 'bigint' },
          { name: 'purpose', type: 'varchar', length: '32' },
          { name: 'uploadStatus', type: 'varchar', length: '32', default: "'pending'" },
          { name: 'uploadMode', type: 'varchar', length: '32', default: "'single_part'" },
          { name: 'multipartUploadId', type: 'varchar', length: '255', isNullable: true },
          { name: 'createdAt', type: dateType, default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: dateType, default: 'CURRENT_TIMESTAMP' },
        ],
        foreignKeys: [
          {
            columnNames: ['uploadedByUserId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['strollId'],
            referencedTableName: 'strolls',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['stageId'],
            referencedTableName: 'stages',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['profileUserId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('media_assets');
  }
}
