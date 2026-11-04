import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { AdventureResultResponse } from '../../core/api/models';
import { AdventuresFeatureService } from '../../features/adventures/adventures-feature.service';
import { StrollsFeatureService } from '../../features/strolls/strolls-feature.service';
import { SbAlertComponent } from '../../components/atoms/sb-alert/sb-alert.component';
import { SbButtonComponent } from '../../components/atoms/sb-button/sb-button.component';
import { SbIconComponent } from '../../components/atoms/sb-icon/sb-icon.component';
import { SbStarRatingComponent } from '../../components/atoms/sb-star-rating/sb-star-rating.component';
import { SbTextareaComponent } from '../../components/atoms/sb-textarea/sb-textarea.component';
import { AdventureResultPageComponent } from './adventure-result-page.component';

describe('AdventureResultPageComponent', () => {
	let fixture: ComponentFixture<AdventureResultPageComponent>;

	beforeEach(async () => {
		const result = {
			adventure: { id: 'adventure-1', progressStatus: 'completed' },
			stroll: null,
			completedStageCount: 2,
			elapsedSeconds: 120,
			routeLengthKm: 1.5,
			correctAnswerCount: 0,
			totalStageCount: 2,
			solvedRiddleCount: 0,
			totalRiddleCount: 0,
			unresolvedRiddleCount: 0
		} as AdventureResultResponse;

		await TestBed.configureTestingModule({
			imports: [AdventureResultPageComponent],
			providers: [
				provideTranslateService(),
				{ provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'adventure-1' } } } },
				{ provide: Router, useValue: { navigate: jest.fn() } },
				{ provide: AdventuresFeatureService, useValue: { getResult: jest.fn(() => of(result)) } },
				{ provide: StrollsFeatureService, useValue: { getMyReview: jest.fn(), submitReview: jest.fn() } }
			]
		})
			.overrideComponent(AdventureResultPageComponent, {
				remove: {
					imports: [SbAlertComponent, SbButtonComponent, SbIconComponent, SbStarRatingComponent, SbTextareaComponent]
				},
				add: { schemas: [NO_ERRORS_SCHEMA] }
			})
			.compileComponents();
	});

	it('renders solved, total, and unresolved counts when no stages have riddles', () => {
		fixture = TestBed.createComponent(AdventureResultPageComponent);
		fixture.detectChanges();

		const stats = fixture.nativeElement.querySelectorAll('.adventure-result__stats > div');
		expect(stats[3].querySelector('strong').textContent).toBe('0/0');
		expect(stats[4].querySelector('strong').textContent).toBe('0');
	});
});
