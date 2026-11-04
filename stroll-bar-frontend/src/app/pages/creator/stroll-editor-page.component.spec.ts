import { HttpErrorResponse } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { of, Subject, throwError } from 'rxjs';
import { StrollsFeatureService } from '../../features/strolls/strolls-feature.service';
import { StageDetailEditorComponent } from './stage-detail-editor.component';
import { StrollEditorPageComponent } from './stroll-editor-page.component';

describe('StrollEditorPageComponent publication readiness', () => {
	const draftDetail = {
		stroll: {
			id: 'stroll-1',
			name: 'A stroll',
			authorId: 'owner-1',
			activeStatus: 'draft',
			labels: [],
			description: 'A stroll description',
			publicityFlag: 'public',
			stageCount: 0,
			length: 0,
			ratingAverage: 0,
			ratingCount: 0,
			reported: false,
			createdAt: '',
			updatedAt: ''
		},
		stages: []
	};

	let feature: {
		getOwnedDetail: jest.Mock;
		create: jest.Mock;
		update: jest.Mock;
		createStage: jest.Mock;
		updateStage: jest.Mock;
		removeStage: jest.Mock;
		reorderStages: jest.Mock;
	};

	beforeEach(async () => {
		feature = {
			getOwnedDetail: jest.fn().mockReturnValue(of(draftDetail)),
			create: jest.fn().mockReturnValue(of({ ...draftDetail.stroll })),
			update: jest.fn().mockReturnValue(of({ ...draftDetail.stroll })),
			createStage: jest.fn().mockReturnValue(of({ id: 'stage-1' })),
			updateStage: jest.fn().mockReturnValue(of({ id: 'stage-1' })),
			removeStage: jest.fn().mockReturnValue(of({ id: 'stage-1', deleted: true })),
			reorderStages: jest.fn().mockReturnValue(of({ strollId: 'stroll-1', reordered: 0 }))
		};

		await TestBed.configureTestingModule({
			imports: [StrollEditorPageComponent],
			providers: [
				provideZonelessChangeDetection(),
				provideRouter([]),
				provideTranslateService(),
				{
					provide: ActivatedRoute,
					useValue: { snapshot: { paramMap: { get: () => 'stroll-1' } } }
				},
				{ provide: StrollsFeatureService, useValue: feature },
				{ provide: MatDialog, useValue: { open: jest.fn() } }
			]
		})
			.overrideComponent(StageDetailEditorComponent, { set: { template: '' } })
			.compileComponents();
	});

	it('defaults a new draft to PUBLIC rather than consuming private quota', async () => {
		TestBed.inject(ActivatedRoute).snapshot.paramMap.get = () => null;
		jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
		const fixture = TestBed.createComponent(StrollEditorPageComponent);
		fixture.detectChanges();
		await fixture.whenStable();
		const component = fixture.componentInstance as any;
		expect(component.stroll.publicity).toBe('public');
		await expect(component.saveChanges()).resolves.toBe(true);
		expect(feature.create).toHaveBeenCalledWith(expect.objectContaining({ activeStatus: 'draft', publicityFlag: 'public' }));
	});

	it('saves a draft first, saves stages, and only then requests publication', async () => {
		const readyDraft = {
			...draftDetail,
			stages: [
				{
					id: 'stage-1',
					strollId: 'stroll-1',
					orderIndex: 1,
					name: 'Stage',
					description: 'Stage description',
					address: 'Street 1',
					latitude: null,
					longitude: null,
					imageUrls: [],
					videoUrls: []
				}
			]
		};
		feature.getOwnedDetail.mockReturnValue(of(readyDraft));
		const fixture = TestBed.createComponent(StrollEditorPageComponent);
		fixture.detectChanges();
		await fixture.whenStable();
		const component = fixture.componentInstance as any;
		component.stroll.status = 'published';

		await expect(component.saveChanges()).resolves.toBe(true);

		expect(feature.update.mock.calls.map((call) => call[1].activeStatus)).toEqual(['draft', 'published']);
		expect(feature.updateStage.mock.invocationCallOrder[0]).toBeLessThan(feature.update.mock.invocationCallOrder[1]);
	});

	it('renders rejected publication and re-enables both save controls before a successful retry', async () => {
		const publication = new Subject<unknown>();
		feature.update.mockImplementation((_, payload) => (payload.activeStatus === 'published' ? publication : of({ ...draftDetail.stroll })));
		const fixture = TestBed.createComponent(StrollEditorPageComponent);
		fixture.detectChanges();
		await fixture.whenStable();
		const component = fixture.componentInstance as any;
		const saveButtons = Array.from(fixture.nativeElement.querySelectorAll('sb-button[icon="save"] button')) as HTMLButtonElement[];
		expect(saveButtons).toHaveLength(2);
		const save = jest.spyOn(component, 'saveChanges');
		const statusSelect = fixture.debugElement.query(By.css('sb-select[name="strollStatus"] mat-select'));
		statusSelect.triggerEventHandler('selectionChange', { value: 'published' });
		await fixture.whenStable();
		expect(statusSelect.nativeElement.textContent).toContain('SCREENS.ADMIN_STATION_EDITOR.STATUS_PUBLISHED');

		saveButtons[1].click();
		await fixture.whenStable();
		expect(saveButtons.every((button) => button.disabled)).toBe(true);

		publication.error(
			new HttpErrorResponse({
				status: 400,
				error: { error: { code: 'STROLL_NOT_READY', errors: [{ field: 'stages', code: 'STROLL_STAGE_REQUIRED' }] } }
			})
		);
		await expect(save.mock.results[0].value).resolves.toBe(false);
		await fixture.whenStable();

		expect(component.stroll.status).toBe('draft');
		expect(statusSelect.nativeElement.textContent).toContain('SCREENS.ADMIN_STATION_EDITOR.STATUS_DRAFT');
		expect(component.validationErrors).toContain('SCREENS.ADMIN_STATION_EDITOR.READINESS.STROLL_STAGE_REQUIRED');
		expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
			'SCREENS.ADMIN_STATION_EDITOR.READINESS.STROLL_STAGE_REQUIRED'
		);
		expect(saveButtons.every((button) => !button.disabled)).toBe(true);

		component.addStage();
		Object.assign(component.stages[0], { name: 'Stage', description: 'Stage description', address: 'Street 1' });
		statusSelect.triggerEventHandler('selectionChange', { value: 'published' });
		await fixture.whenStable();
		feature.update.mockReturnValue(of({ ...draftDetail.stroll, activeStatus: 'published' }));
		feature.getOwnedDetail.mockReturnValue(
			of({
				...draftDetail,
				stroll: { ...draftDetail.stroll, activeStatus: 'published' }
			})
		);
		saveButtons[1].click();
		await expect(save.mock.results[1].value).resolves.toBe(true);
		await fixture.whenStable();

		expect(feature.createStage).toHaveBeenCalled();
		expect(feature.update.mock.calls.map((call) => call[1].activeStatus)).toEqual(['draft', 'published', 'draft', 'published']);
		expect(component.stroll.status).toBe('published');
		expect(statusSelect.nativeElement.textContent).toContain('SCREENS.ADMIN_STATION_EDITOR.STATUS_PUBLISHED');
		expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
		expect(fixture.nativeElement.textContent).toContain('SCREENS.ADMIN_STATION_EDITOR.SAVED');
		expect(saveButtons.every((button) => !button.disabled)).toBe(true);
	});

	it('renders an asynchronous save error and restores the save controls', async () => {
		const update = new Subject<unknown>();
		feature.update.mockReturnValue(update);
		const fixture = TestBed.createComponent(StrollEditorPageComponent);
		fixture.detectChanges();
		await fixture.whenStable();
		const saveButtons = Array.from(fixture.nativeElement.querySelectorAll('sb-button[icon="save"] button')) as HTMLButtonElement[];
		const save = jest.spyOn(fixture.componentInstance as any, 'saveChanges');

		saveButtons[1].click();
		await fixture.whenStable();
		expect(saveButtons.every((button) => button.disabled)).toBe(true);

		update.error(new HttpErrorResponse({ status: 500 }));
		await expect(save.mock.results[0].value).resolves.toBe(false);
		await fixture.whenStable();

		expect(fixture.nativeElement.textContent).toContain('SCREENS.ADMIN_STATION_EDITOR.SAVE_ERROR');
		expect(saveButtons.every((button) => !button.disabled)).toBe(true);
	});

	it('saves edits to a published stroll as draft and shows automatic-unpublish feedback', async () => {
		const publishedDetail = {
			...draftDetail,
			stroll: { ...draftDetail.stroll, activeStatus: 'published' },
			stages: [
				{
					id: 'stage-1',
					strollId: 'stroll-1',
					orderIndex: 1,
					name: 'Stage',
					description: 'Stage description',
					address: 'Street 1',
					latitude: null,
					longitude: null,
					imageUrls: [],
					videoUrls: []
				}
			]
		};
		feature.getOwnedDetail.mockReturnValue(of(publishedDetail));
		feature.updateStage.mockReturnValue(of({ id: 'stage-1' }));
		feature.update.mockImplementation((_, payload) =>
			payload.activeStatus === 'published'
				? throwError(
						() =>
							new HttpErrorResponse({
								status: 400,
								error: {
									error: {
										code: 'STROLL_NOT_READY',
										errors: [{ field: 'stages.0.location', code: 'STAGE_LOCATION_REQUIRED' }]
									}
								}
							})
					)
				: of({ ...publishedDetail.stroll, activeStatus: 'draft' })
		);
		const fixture = TestBed.createComponent(StrollEditorPageComponent);
		fixture.detectChanges();
		await fixture.whenStable();
		const component = fixture.componentInstance as any;
		component.stroll.status = 'published';
		component.stages[0].address = ' ';
		component.stages[0].latitude = null;
		component.stages[0].longitude = null;

		await expect(component.saveChanges()).resolves.toBe(true);
		await fixture.whenStable();

		expect(component.autoUnpublished).toBe(true);
		expect(component.stroll.status).toBe('draft');
		expect(fixture.nativeElement.textContent).toContain('SCREENS.ADMIN_STATION_EDITOR.AUTO_UNPUBLISHED');
		expect(fixture.nativeElement.textContent).toContain('SCREENS.ADMIN_STATION_EDITOR.READINESS.STAGE_LOCATION_REQUIRED');
	});
});
