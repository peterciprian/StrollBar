import { lifecycleRetryDelay, RoleLifecycleDispatcher } from './role-lifecycle-dispatcher.service';

describe('ROLE-04 bounded lifecycle job', () => {
	it('drains due work, reports failed attempts, and exits when no more work is due', async () => {
		const dispatcher = new RoleLifecycleDispatcher({} as never, {} as never);
		const claim = jest.spyOn(dispatcher, 'dispatchOne').mockResolvedValue('idle');
		claim.mockResolvedValueOnce('sent').mockResolvedValueOnce('skipped').mockResolvedValueOnce('retry');
		expect(await dispatcher.drain()).toEqual({ sent: 1, skipped: 1, retry: 1, exhausted: false });
		expect(claim).toHaveBeenCalledTimes(20);
	});

	it('has a bounded run budget shorter than the ten-minute schedule', async () => {
		const dispatcher = new RoleLifecycleDispatcher({} as never, {} as never);
		const claim = jest.spyOn(dispatcher, 'dispatchOne');
		expect(await dispatcher.drain(0)).toEqual({ sent: 0, skipped: 0, retry: 0, exhausted: true });
		expect(claim).not.toHaveBeenCalled();
	});

	it('uses automatic exponential retry with a ten-minute cap, not a provider-TTL quarantine', () => {
		expect([1, 2, 3, 4, 5, 6, 1000].map(lifecycleRetryDelay)).toEqual([30000, 60000, 120000, 240000, 480000, 600000, 600000]);
	});
});
