import { runLegacyCutover } from './legacy-role-cutover.cli';

const initialize = jest.fn().mockResolvedValue(undefined);
const destroy = jest.fn().mockResolvedValue(undefined);
const find = jest.fn().mockResolvedValue([]);
const dataSource = jest.fn().mockImplementation(() => ({
	initialize, destroy, getRepository: () => ({ find })
}));

jest.mock('typeorm', () => ({
	...jest.requireActual('typeorm'),
	DataSource: function (options: unknown) { return dataSource(options); }
}));

describe('legacy cutover operator CLI safety', () => {
	const oldName = process.env.DB_NAME;
	const oldRun = process.env.DB_MIGRATIONS_RUN;

	beforeEach(() => {
		jest.clearAllMocks();
		process.env.DB_NAME = 'role01_cli_unit_only';
		process.env.DB_MIGRATIONS_RUN = 'true';
	});

	afterAll(() => {
		if (oldName === undefined) delete process.env.DB_NAME;
		else process.env.DB_NAME = oldName;
		if (oldRun === undefined) delete process.env.DB_MIGRATIONS_RUN;
		else process.env.DB_MIGRATIONS_RUN = oldRun;
	});

	it('defaults to read-only preview and never runs schema migrations even if configured at startup', async () => {
		await expect(runLegacyCutover([])).resolves.toMatchObject({ dryRun: true, targets: [], contentChanges: 0, adminChanges: 0 });
		expect(dataSource).toHaveBeenCalledWith(expect.objectContaining({ migrationsRun: false, synchronize: false }));
		expect(destroy).toHaveBeenCalled();
	});

	it('keeps requested notice/cutover operations read-only without --apply', async () => {
		await expect(runLegacyCutover(['--operation=notice'])).resolves.toMatchObject({ dryRun: true });
		await expect(runLegacyCutover(['--operation=cutover'])).resolves.toMatchObject({ dryRun: true });
	});

	it.each([
		['--operation=cutover', '--apply'],
		['--operation=cutover', '--apply', '--confirm-db=wrong'],
		['--operation=cutover', '--apply', '--confirm-db=role01_cli_unit_only'],
		['--operation=preview', '--apply'],
		['--operation=cutover', '--apply=false'],
		['--operation=unknown'],
		['--unknown'],
		['--operation=notice', '--operation=cutover']
	])('rejects unsafe/ambiguous arguments before connecting: %j', async (...args: string[]) => {
		await expect(runLegacyCutover(args)).rejects.toThrow();
		expect(initialize).not.toHaveBeenCalled();
	});
});
