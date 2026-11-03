import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { StrollsFeatureService } from '../../features/strolls/strolls-feature.service';
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
			.compileComponents();
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

	it('shows localized field-specific feedback when explicit publication is rejected', async () => {
		feature.update.mockImplementation((_, payload) =>
			payload.activeStatus === 'published'
				? throwError(
						() =>
							new HttpErrorResponse({
								status: 400,
								error: {
									error: {
										code: 'STROLL_NOT_READY',
										errors: [{ field: 'stages', code: 'STROLL_STAGE_REQUIRED' }]
									}
								}
							})
					)
				: of({ ...draftDetail.stroll })
		);
		const fixture = TestBed.createComponent(StrollEditorPageComponent);
		fixture.detectChanges();
		await fixture.whenStable();
		const component = fixture.componentInstance as any;
		component.stroll.status = 'published';

		await expect(component.saveChanges()).resolves.toBe(false);
		fixture.detectChanges();

		expect(component.stroll.status).toBe('draft');
		expect(component.validationErrors).toContain('SCREENS.ADMIN_STATION_EDITOR.READINESS.STROLL_STAGE_REQUIRED');
		expect(fixture.nativeElement.textContent).toContain('SCREENS.ADMIN_STATION_EDITOR.READINESS.STROLL_STAGE_REQUIRED');
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
		fixture.detectChanges();

		expect(component.autoUnpublished).toBe(true);
		expect(component.stroll.status).toBe('draft');
		expect(fixture.nativeElement.textContent).toContain('SCREENS.ADMIN_STATION_EDITOR.AUTO_UNPUBLISHED');
		expect(fixture.nativeElement.textContent).toContain('SCREENS.ADMIN_STATION_EDITOR.READINESS.STAGE_LOCATION_REQUIRED');
	});
});
