import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './database.config';
import { LegacyRoleCutover } from '../modules/users/legacy-role-cutover';

export async function runLegacyCutover(args: string[]) {
	const allowed = new Set(['operation', 'users', 'actor', 'cutover-at', 'notice-reference', 'confirm-db', 'apply']);
	const options = new Map<string, string>();
	for (const arg of args) {
		const match = /^--([a-z-]+)(?:=(.*))?$/.exec(arg);
		if (!match || !allowed.has(match[1]) || options.has(match[1])) throw new Error(`Unknown/duplicate argument: ${arg}`);
		if (match[1] === 'apply' && match[2] !== undefined) throw new Error('Use bare --apply only; --apply=false is not a dry run.');
		options.set(match[1], match[2] ?? '');
	}
	const operation = options.get('operation') ?? 'preview';
	if (!['preview', 'notice', 'cutover'].includes(operation)) throw new Error('Operation must be preview, notice or cutover.');
	const apply = options.has('apply');
	if (apply && operation === 'preview') throw new Error('Preview cannot apply changes.');
	const config = buildDataSourceOptions();
	if (apply && (!process.env.DB_HOST || !process.env.DB_PORT || !process.env.DB_NAME || options.get('confirm-db') !== process.env.DB_NAME)) {
		throw new Error('Writes require explicit DB_HOST, DB_PORT, DB_NAME and --confirm-db matching DB_NAME.');
	}
	const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	const userIds = (options.get('users') ?? '').split(',').filter(Boolean);
	const actor = options.get('actor') ?? '';
	if (apply && (!uuid.test(actor) || !userIds.length || userIds.some((id) => !uuid.test(id)))) {
		throw new Error('Writes require --actor UUID and explicit comma-separated --users UUIDs.');
	}
	// Never run pending schema migrations or synchronize as a side effect of this command.
	const dataSource = new DataSource({ ...config, migrationsRun: false, synchronize: false });
	await dataSource.initialize();
	try {
		const cutover = new LegacyRoleCutover(dataSource);
		if (!apply) return {
			operation, requestedUserIds: userIds,
			target: { host: process.env.DB_HOST ?? '127.0.0.1', port: process.env.DB_PORT ?? '5432', database: process.env.DB_NAME ?? 'strollbar' },
			...(await cutover.preview())
		};
		if (operation === 'notice') {
			const value = options.get('cutover-at') ?? '';
			if (!value.endsWith('Z')) throw new Error('--cutover-at must be an explicit UTC ISO timestamp ending in Z.');
			return await cutover.recordNotice(userIds, new Date(value), options.get('notice-reference') ?? '', actor);
		}
		return await cutover.cutover(userIds, actor);
	} finally {
		await dataSource.destroy();
	}
}

if (require.main === module) {
	runLegacyCutover(process.argv.slice(2))
		.then((result) => console.log(JSON.stringify({ operation: 'legacy_role_cutover', ...result })))
		.catch((error: unknown) => {
			console.error(JSON.stringify({ operation: 'legacy_role_cutover', success: false, error: error instanceof Error ? error.message : String(error) }));
			process.exitCode = 1;
		});
}
