import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AuthTokensAndPasswordReset1752885000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    await queryRunner.addColumns('users', [
      new TableColumn({
        name: 'refreshTokenHash',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
      new TableColumn({
        name: 'resetPasswordTokenHash',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
      new TableColumn({
        name: 'resetPasswordExpiresAt',
        type: isPostgres ? 'timestamptz' : 'datetime',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'resetPasswordExpiresAt');
    await queryRunner.dropColumn('users', 'resetPasswordTokenHash');
    await queryRunner.dropColumn('users', 'refreshTokenHash');
  }
}
