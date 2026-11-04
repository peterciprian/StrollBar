import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { BrowseStrollsResponse, ListStrollsQuery, StrollCategory, StrollSummary } from '../../core/api/models';
import { NotificationService } from '../../core/services/notification.service';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { AdventuresFeatureService } from '../../features/adventures/adventures-feature.service';
import { StrollsFeatureService } from '../../features/strolls/strolls-feature.service';
import { StrollBrowserScreenComponent } from './stroll-browser.component';

function stroll(index: number, category = StrollCategory.ENTERTAINMENT): StrollSummary {
	return {
		id: `stroll-${index}`,
		name: `Walk ${index}`,
		authorId: 'owner',
		description: 'A riverside description',
		labels: [],
		category,
		length: 1,
		stageCount: 2,
		ratingAverage: 0,
		ratingCount: 0,
		publicityFlag: 'public'
	};
}

describe('StrollBrowserScreenComponent PROD-04', () => {
	let fixture: ComponentFixture<StrollBrowserScreenComponent>;
	let component: StrollBrowserScreenComponent;
	const params = new BehaviorSubject(convertToParamMap({}));
	const items = Array.from({ length: 45 }, (_, index) => stroll(index + 1));
	const feature = {
		browse: jest.fn(),
		getDetail: jest.fn(),
		listReviews: jest.fn(() => of({ items: [], ratingAverage: 0, ratingCount: 0 }))
	};
	const router = { navigate: jest.fn().mockResolvedValue(true) };

	beforeEach(async () => {
		jest.clearAllMocks();
		params.next(convertToParamMap({}));
		feature.browse.mockImplementation((query: ListStrollsQuery) =>
			of({
				items: items.slice(((query.page ?? 1) - 1) * 20, (query.page ?? 1) * 20),
				page: query.page ?? 1,
				limit: 20,
				total: items.length
			})
		);
		feature.getDetail.mockReturnValue(of({ stroll: stroll(99), stages: [] }));
		await TestBed.configureTestingModule({
			imports: [StrollBrowserScreenComponent],
			providers: [
				provideTranslateService(),
				{ provide: StrollsFeatureService, useValue: feature },
				{ provide: AdventuresFeatureService, useValue: {} },
				{ provide: TokenStorageService, useValue: { getAccessToken: () => null } },
				{ provide: NotificationService, useValue: {} },
				{ provide: MatDialog, useValue: {} },
				{ provide: Router, useValue: router },
				{ provide: ActivatedRoute, useValue: { queryParamMap: params } }
			]
		}).compileComponents();
		fixture = TestBed.createComponent(StrollBrowserScreenComponent);
		component = fixture.componentInstance;
	});

	it('requests default pagination and renders numbered navigation, Previous and Next', () => {
		fixture.detectChanges();
		expect(feature.browse).toHaveBeenLastCalledWith({ page: 1, limit: 20, search: undefined, sortBy: 'newest' });
		const pages = fixture.nativeElement.querySelectorAll('.stroll-browser__page') as NodeListOf<HTMLButtonElement>;
		expect(Array.from(pages).map((page) => page.textContent?.trim())).toEqual(['1', '2', '3']);
		expect(pages[0].getAttribute('aria-current')).toBe('page');
		const navigation = fixture.debugElement.queryAll(By.css('.stroll-browser__pagination sb-button'));
		expect(navigation[0].componentInstance.disabled()).toBe(true);
		navigation[1].triggerEventHandler('clicked');
		fixture.detectChanges();
		expect(feature.browse).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
		expect(component['strolls'][0].id).toBe('stroll-21');
		fixture.nativeElement.querySelectorAll('.stroll-browser__page')[2].click();
		fixture.detectChanges();
		expect(feature.browse).toHaveBeenLastCalledWith(expect.objectContaining({ page: 3 }));
		expect(component['strolls']).toHaveLength(5);
		expect(navigation[1].componentInstance.disabled()).toBe(true);
		navigation[0].triggerEventHandler('clicked');
		expect(component['page']()).toBe(2);
	});

	it('sends search to the server from the field, resets page, and does not filter name-only locally', () => {
		fixture.detectChanges();
		component['changePage'](2);
		const result = stroll(100);
		feature.browse.mockReturnValueOnce(of({ items: [result], page: 1, limit: 20, total: 1 }));
		fixture.debugElement.query(By.css('sb-search-field')).triggerEventHandler('searched', '  Budapest  ');
		fixture.detectChanges();
		expect(feature.browse).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'Budapest', page: 1, limit: 20 }));
		expect(component['filteredStrolls']).toEqual([result]);
		expect(fixture.nativeElement.querySelectorAll('app-stroll-card')).toHaveLength(1);
		component['changeSearch'](' ');
		expect(feature.browse).toHaveBeenLastCalledWith(expect.objectContaining({ search: undefined, page: 1 }));
	});

	it('keeps category page-local, never sends category, and resets later pages on category changes', () => {
		fixture.detectChanges();
		const other = Object.values(StrollCategory).find((category) => category !== StrollCategory.ENTERTAINMENT)!;
		const calls = feature.browse.mock.calls.length;
		component['selectCategory'](other);
		expect(feature.browse).toHaveBeenCalledTimes(calls);
		expect(component['filteredStrolls']).toEqual([]);
		expect(component['total']()).toBe(45);
		expect(component['pageCount']()).toBe(3);
		component['changePage'](2);
		component['selectCategory']('ALL');
		expect(feature.browse).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }));
		for (const [query] of feature.browse.mock.calls) expect(query).not.toHaveProperty('category');
	});

	it('resets page for sort changes and preserves the nearest-location fallback', async () => {
		fixture.detectChanges();
		component['changePage'](2);
		await component['changeSort']('top_rated');
		expect(feature.browse).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, sortBy: 'top_rated' }));
		const location = jest.spyOn(
			component as unknown as { requestUserLocation: () => Promise<{ latitude: number; longitude: number } | null> },
			'requestUserLocation'
		);
		location.mockResolvedValueOnce(null);
		await component['changeSort']('nearest');
		expect(component['locationError']()).toBe(true);
		expect(feature.browse).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, sortBy: 'newest' }));
		location.mockResolvedValueOnce({ latitude: 47, longitude: 19 });
		await component['changeSort']('nearest');
		expect(feature.browse).toHaveBeenLastCalledWith(
			expect.objectContaining({
				page: 1,
				sortBy: 'nearest',
				userLatitude: 47,
				userLongitude: 19
			})
		);
		location.mockRestore();
	});

	it('preserves deep-linked off-page details without changing items, counts or numbered pages', () => {
		params.next(convertToParamMap({ strollId: 'stroll-99' }));
		fixture.detectChanges();
		expect(component['selectedStroll']?.id).toBe('stroll-99');
		expect(component['strolls']).toHaveLength(20);
		expect(component['strolls'].some((item) => item.id === 'stroll-99')).toBe(false);
		expect(component['total']()).toBe(45);
		expect(component['pageNumbers']()).toEqual([1, 2, 3]);
		component['changePage'](2);
		expect(component['selectedStroll']?.id).toBe('stroll-99');
		expect(component['strolls'][0].id).toBe('stroll-21');
		expect(feature.getDetail).toHaveBeenCalledTimes(1);
	});

	it('falls back to page selection and clears a failed deep link without adding a result', () => {
		feature.getDetail.mockReturnValueOnce(throwError(() => new Error('Forbidden')));
		fixture.detectChanges();
		params.next(convertToParamMap({ strollId: 'unavailable' }));
		expect(component['selectedStroll']?.id).toBe('stroll-1');
		expect(component['strolls']).toHaveLength(20);
		expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { strollId: null } }));
	});

	it('cancels stale browse requests and exposes loading and errors without stale counts', () => {
		const old = new Subject<BrowseStrollsResponse>();
		feature.browse.mockReturnValueOnce(old);
		fixture.detectChanges();
		expect(component['loading']()).toBe(true);
		component['changeSearch']('new');
		old.next({ items: [stroll(99)], page: 1, limit: 20, total: 999 });
		expect(component['total']()).toBe(45);
		feature.browse.mockReturnValueOnce(throwError(() => new Error('Network failed')));
		component['changeSearch']('error');
		fixture.detectChanges();
		expect(component['loading']()).toBe(false);
		expect(component['browseError']()).toBe(true);
		expect(component['strolls']).toEqual([]);
		expect(component['total']()).toBe(0);
		expect(fixture.nativeElement.querySelector('sb-alert')?.textContent).toContain('LOAD_ERROR');
	});

	it('recovers when the server total shrinks below the selected page and handles zero results', () => {
		fixture.detectChanges();
		feature.browse.mockReturnValueOnce(of({ items: [], page: 3, limit: 20, total: 0 }));
		feature.browse.mockReturnValueOnce(of({ items: [], page: 1, limit: 20, total: 0 }));
		component['changePage'](3);
		fixture.detectChanges();
		expect(feature.browse).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }));
		expect(component['pageCount']()).toBe(1);
		expect(component['selectedStroll']).toBeNull();
		expect(component['pageNumbers']()).toEqual([1]);
	});

	it('bounds the number list for large result sets', () => {
		fixture.detectChanges();
		component['total'].set(20000);
		component['page'].set(500);
		expect(component['pageNumbers']()).toEqual([1, null, 498, 499, 500, 501, 502, null, 1000]);
	});
});
