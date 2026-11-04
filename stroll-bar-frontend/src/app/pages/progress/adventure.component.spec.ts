import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { Stage, AdventureDetailResponse } from '../../core/api/models';
import { NotificationService } from '../../core/services/notification.service';
import { AdventuresFeatureService } from '../../features/adventures/adventures-feature.service';
import { StrollsFeatureService } from '../../features/strolls/strolls-feature.service';
import { MediaGalleryComponent } from '../../components/media-gallery/media-gallery.component';
import { SbButtonComponent } from '../../components/atoms/sb-button/sb-button.component';
import { SbIconComponent } from '../../components/atoms/sb-icon/sb-icon.component';
import { SbIconButtonComponent } from '../../components/atoms/sb-icon-button/sb-icon-button.component';
import { SbInputComponent } from '../../components/atoms/sb-input/sb-input.component';
import { SbProgressBarComponent } from '../../components/atoms/sb-progress-bar/sb-progress-bar.component';
import { SbSpinnerComponent } from '../../components/atoms/sb-spinner/sb-spinner.component';
import { StageLocationMapComponent } from '../creator/stage-location-map.component';
import { AdventureScreenComponent } from './adventure.component';

describe('AdventureScreenComponent', () => {
	let fixture: ComponentFixture<AdventureScreenComponent>;
	let adventuresFeature: { get: jest.Mock; navigate: jest.Mock; submitAnswer: jest.Mock };
	let currentStage: Stage;
	let response: AdventureDetailResponse;

	beforeEach(async () => {
		currentStage = {
			id: 'stage-1',
			strollId: 'stroll-1',
			orderIndex: 1,
			name: 'Stage one',
			description: 'A stage',
			hasRiddle: false
		};
		response = {
			adventure: { id: 'adventure-1', currentStageIndex: 1, progressStatus: 'in_progress' } as any,
			stroll: { id: 'stroll-1', stageCount: 2 } as any,
			currentStage
		};
		adventuresFeature = {
			get: jest.fn(() => of(response)),
			navigate: jest.fn(() => of(response)),
			submitAnswer: jest.fn(() => of({ isCorrect: false, adventure: response.adventure, stageId: currentStage.id }))
		};

		await TestBed.configureTestingModule({
			imports: [AdventureScreenComponent],
			providers: [
				provideTranslateService(),
				{
					provide: ActivatedRoute,
					useValue: {
						snapshot: { paramMap: convertToParamMap({ adventureId: 'adventure-1' }) },
						paramMap: of(convertToParamMap({ adventureId: 'adventure-1' }))
					}
				},
				{ provide: Router, useValue: { navigate: jest.fn() } },
				{ provide: AdventuresFeatureService, useValue: adventuresFeature },
				{ provide: StrollsFeatureService, useValue: { report: jest.fn() } },
				{ provide: NotificationService, useValue: { showSuccess: jest.fn(), showError: jest.fn() } },
				{ provide: MatDialog, useValue: { open: jest.fn() } }
			]
		})
			.overrideComponent(AdventureScreenComponent, {
				remove: {
					imports: [
						MediaGalleryComponent,
						SbButtonComponent,
						SbIconComponent,
						SbIconButtonComponent,
						SbProgressBarComponent,
						SbSpinnerComponent,
						StageLocationMapComponent
					]
				},
				add: { schemas: [NO_ERRORS_SCHEMA] }
			})
			.compileComponents();
	});

	function render(): void {
		fixture = TestBed.createComponent(AdventureScreenComponent);
		fixture.detectChanges();
	}

	it('shows the answer form only when the current stage has a riddle', () => {
		render();
		expect(fixture.nativeElement.querySelector('.adventure__answer-field')).toBeNull();

		currentStage = { ...currentStage, hasRiddle: true };
		response = { ...response, currentStage };
		adventuresFeature.get.mockReturnValue(of(response));
		(fixture.componentInstance as any).applyDetail(response);
		fixture.detectChanges();

		expect(fixture.nativeElement.querySelector('.adventure__answer-field')).not.toBeNull();
	});

	it('allows next navigation on a no-riddle stage and does not submit an answer', () => {
		render();

		(fixture.componentInstance as any).answer = 'ignored';
		(fixture.componentInstance as any).submitAnswer();
		(fixture.componentInstance as any).goToNextStage();

		expect(adventuresFeature.submitAnswer).not.toHaveBeenCalled();
		expect(adventuresFeature.navigate).toHaveBeenCalledWith('adventure-1', 'next');
	});
});
