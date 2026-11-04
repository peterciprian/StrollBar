import { ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListOwnedStrollsQueryDto } from './list-owned-strolls-query.dto';
import { ListStrollsQueryDto, STROLL_SORT_OPTIONS } from './list-strolls-query.dto';

describe('Browse query validation', () => {
	it('uses the existing defaults and trims search/city only for browse', async () => {
		const query = plainToInstance(ListStrollsQueryDto, { search: '  A %_!  ', city: '  Budapest ' });
		expect(query).toMatchObject({ page: 1, limit: 20, search: 'A %_!', city: 'Budapest' });
		expect(await validate(query)).toEqual([]);
		expect(plainToInstance(ListOwnedStrollsQueryDto, { search: '  A  ', city: ' B ' })).toMatchObject({ search: '  A  ', city: ' B ' });
	});

	it.each(STROLL_SORT_OPTIONS)('accepts sort %s and the upper page-size bound', async (sortBy) => {
		const query = plainToInstance(ListStrollsQueryDto, {
			sortBy,
			page: '2',
			limit: '100',
			userLatitude: '-90',
			userLongitude: '180'
		});
		expect(await validate(query)).toEqual([]);
		expect(query).toMatchObject({ page: 2, limit: 100, userLatitude: -90, userLongitude: 180 });
	});

	it.each([
		{ sortBy: 'most_used' },
		{ sortBy: 'invalid' },
		{ page: 0 },
		{ page: 1.5 },
		{ page: 'NaN' },
		{ limit: 0 },
		{ limit: 101 },
		{ limit: 2.5 },
		{ userLatitude: 91 },
		{ userLongitude: -181 },
		{ search: ['a', 'b'] },
		{ city: 123 }
	])('rejects invalid browse query %j', async (query) => {
		expect((await validate(plainToInstance(ListStrollsQueryDto, query))).length).toBeGreaterThan(0);
	});

	it('rejects unsupported category queries instead of inventing server category semantics', async () => {
		const pipe = new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true });
		await expect(pipe.transform({ category: 'HISTORY' }, { type: 'query', metatype: ListStrollsQueryDto })).rejects.toThrow('Bad Request');
	});

	it('preserves the owner listing sort validation', async () => {
		expect(await validate(plainToInstance(ListOwnedStrollsQueryDto, { sortBy: 'legacy-value' }))).toEqual([]);
	});
});
