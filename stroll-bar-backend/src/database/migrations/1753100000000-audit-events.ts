import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AuditEvents1753100000000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.createTable(
			new Table({
				name: 'audit_events',
				columns: [
					{ name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
					{ name: 'action', type: 'varchar', length: '32' },
					{ name: 'userId', type: 'uuid', isNullable: true },
					{ name: 'actorUserId', type: 'uuid', isNullable: true },
					{ name: 'success', type: 'boolean' },
					{ name: 'ipAddress', type: 'varchar', length: '64', isNullable: true },
					{ name: 'metadata', type: 'jsonb', default: "'{}'" },
					{ name: 'createdAt', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' }
				]
			})
		);
		await queryRunner.createIndex(
			'audit_events',
			new TableIndex({ name: 'IDX_audit_events_action_createdAt', columnNames: ['action', 'createdAt'] })
		);
		await queryRunner.createIndex(
			'audit_events',
			new TableIndex({ name: 'IDX_audit_events_user_createdAt', columnNames: ['userId', 'createdAt'] })
		);
		await queryRunner.query(`
			CREATE OR REPLACE FUNCTION prevent_audit_event_mutation() RETURNS trigger AS $$
			BEGIN
				IF current_setting('strollbar.audit_retention', true) = 'true' THEN
					RETURN OLD;
				END IF;
				RAISE EXCEPTION 'audit_events is append-only';
			END;
			$$ LANGUAGE plpgsql;
		`);
		await queryRunner.query(`
			CREATE TRIGGER audit_events_append_only
			BEFORE UPDATE OR DELETE ON audit_events
			FOR EACH ROW EXECUTE FUNCTION prevent_audit_event_mutation();
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('DROP TRIGGER IF EXISTS audit_events_append_only ON audit_events');
		await queryRunner.query('DROP FUNCTION IF EXISTS prevent_audit_event_mutation()');
		await queryRunner.dropTable('audit_events');
	}
}
