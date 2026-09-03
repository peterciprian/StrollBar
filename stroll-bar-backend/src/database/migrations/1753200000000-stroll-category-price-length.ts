import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class StrollCategoryPriceLength1753200000000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		const isPostgres = queryRunner.connection.options.type === 'postgres';
		const floatType = isPostgres ? 'double precision' : 'float';
		const jsonType = isPostgres ? 'jsonb' : 'text';
		await queryRunner.addColumn('strolls', new TableColumn({ name: 'category', type: 'varchar', default: "'HISTORICAL'" }));
		await queryRunner.addColumn('strolls', new TableColumn({ name: 'price', type: jsonType, isNullable: true }));
		await queryRunner.addColumn('strolls', new TableColumn({ name: 'length', type: floatType, default: '0' }));
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropColumn('strolls', 'length');
		await queryRunner.dropColumn('strolls', 'price');
		await queryRunner.dropColumn('strolls', 'category');
	}
}
