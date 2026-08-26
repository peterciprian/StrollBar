import { Component, ChangeDetectorRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslatePipe } from '@ngx-translate/core';
import { map } from 'rxjs';

import { MapPreviewComponent } from '../../components/map-preview/map-preview.component';
import { MediaGalleryComponent } from '../../components/media-gallery/media-gallery.component';
import { AdventuresFeatureService } from '../../features/adventures/adventures-feature.service';
import { Adventure, AdventureDetailResponse, AdventureNavigateDirection, Stage, Stroll } from '../../core/api/models';
import { MOCK_TOURS, Tour } from '../../core/models/screens.models';

@Component({
	selector: 'app-adventure-screen',
	standalone: true,
	imports: [
		CommonModule,
		UpperCasePipe,
		FormsModule,
		MatFormFieldModule,
		MatInputModule,
		MatIconModule,
		MatButtonModule,
		MatProgressBarModule,
		TranslatePipe,
		MapPreviewComponent,
		MediaGalleryComponent
	],
	templateUrl: './adventure.component.html',
	styleUrls: ['./adventure.component.scss']
})
export class AdventureScreenComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly adventuresFeature = inject(AdventuresFeatureService);
	private readonly cdr = inject(ChangeDetectorRef);

	protected readonly adventureId = this.route.snapshot.paramMap.get('adventureId') ?? '';

	// Stand-in stroll/adventure used only while the real endpoints have no seeded data for this id.
	private readonly demoTour: Tour = MOCK_TOURS[0];
	private readonly demoAdventure: Adventure = this.createDemoAdventure();

	protected loading = true;
	protected currentStage: Stage | null = null;
	protected currentStageIndex = 1;
	protected totalStages = 1;

	protected answer = '';
	protected submitted = false;
	protected feedbackCorrect = false;

	ngOnInit(): void {
		this.loadAdventure();
	}

	protected get progressPercent(): number {
		return (this.currentStageIndex / this.totalStages) * 100;
	}

	protected get canGoPrevious(): boolean {
		return this.currentStageIndex > 1;
	}

	protected get canGoNext(): boolean {
		return this.currentStageIndex < this.totalStages;
	}

	protected submitAnswer(): void {
		if (!this.currentStage || !this.answer.trim()) {
			return;
		}

		this.adventuresFeature
			.submitAnswer(this.adventureId, this.currentStage.id, this.answer)
			.pipe(map((result) => (this.isUsableAnswerResult(result) ? result : this.demoSubmitAnswer())))
			.subscribe({
				next: (result) => this.applyAnswerResult(result),
				error: () => this.applyAnswerResult(this.demoSubmitAnswer())
			});
	}

	private applyAnswerResult(result: { isCorrect: boolean; adventure: Adventure; stageId: string }): void {
		this.submitted = true;
		this.feedbackCorrect = result.isCorrect;
		this.cdr.detectChanges();

		if (result.isCorrect) {
			this.reloadCurrentStage();
		}
	}

	protected goToPreviousStage(): void {
		this.navigateStage('previous');
	}

	protected goToNextStage(): void {
		this.navigateStage('next');
	}

	private navigateStage(direction: AdventureNavigateDirection): void {
		this.adventuresFeature
			.navigate(this.adventureId, direction)
			.pipe(map((detail) => (this.isUsableDetail(detail) ? detail : this.demoNavigate(direction))))
			.subscribe({
				next: (detail) => this.applyDetail(detail),
				error: () => this.applyDetail(this.demoNavigate(direction))
			});
	}

	private loadAdventure(): void {
		this.loading = true;

		// Calls the real "get adventure by id" endpoint; falls back to a demo stroll on error, empty, or missing response.
		// Both next and error are handled explicitly so the loading flag always clears, even if the fallback itself fails.
		this.adventuresFeature
			.get(this.adventureId)
			.pipe(map((detail) => (this.isUsableDetail(detail) ? detail : this.buildDemoDetail())))
			.subscribe({
				next: (detail) => {
					this.loading = false;
					this.applyDetail(detail);
				},
				error: () => {
					this.loading = false;
					this.applyDetail(this.buildDemoDetail());
				}
			});
	}

	private reloadCurrentStage(): void {
		this.adventuresFeature
			.get(this.adventureId)
			.pipe(map((detail) => (this.isUsableDetail(detail) ? detail : this.buildDemoDetail())))
			.subscribe({
				next: (detail) => this.applyDetail(detail),
				error: () => this.applyDetail(this.buildDemoDetail())
			});
	}

	private applyDetail(detail: AdventureDetailResponse): void {
		this.currentStage = detail.currentStage;
		this.currentStageIndex = detail.adventure.currentStageIndex;
		this.totalStages = detail.stroll?.stageCount ?? this.totalStages;
		this.answer = '';
		this.submitted = false;

		// HTTP error callbacks in this app don't reliably re-enter Angular's zone, so force a refresh.
		this.cdr.detectChanges();
	}

	private isUsableDetail(detail: AdventureDetailResponse | null | undefined): detail is AdventureDetailResponse {
		return !!detail && !!detail.adventure && !!detail.currentStage;
	}

	private isUsableAnswerResult(
		result: { isCorrect: boolean; adventure: Adventure; stageId: string } | null | undefined
	): result is { isCorrect: boolean; adventure: Adventure; stageId: string } {
		return !!result && !!result.adventure && typeof result.isCorrect === 'boolean';
	}

	private demoSubmitAnswer(): { isCorrect: boolean; adventure: Adventure; stageId: string } {
		// The demo stage has no stored riddle answer, so any non-empty answer is accepted, matching backend behavior.
		const stageCount = this.demoTour.stations.length;

		if (this.demoAdventure.currentStageIndex < stageCount) {
			this.demoAdventure.currentStageIndex += 1;
		} else {
			this.demoAdventure.completionDateTime = new Date().toISOString();
			this.demoAdventure.progressStatus = 'completed';
		}

		return { isCorrect: true, adventure: { ...this.demoAdventure }, stageId: this.currentStage?.id ?? '' };
	}

	private demoNavigate(direction: AdventureNavigateDirection): AdventureDetailResponse {
		const stageCount = this.demoTour.stations.length;

		this.demoAdventure.currentStageIndex =
			direction === 'next'
				? Math.min(this.demoAdventure.currentStageIndex + 1, stageCount)
				: Math.max(this.demoAdventure.currentStageIndex - 1, 1);

		return this.buildDemoDetail();
	}

	private buildDemoDetail(): AdventureDetailResponse {
		const clampedIndex = Math.min(Math.max(this.demoAdventure.currentStageIndex, 1), this.demoTour.stations.length);
		const station = this.demoTour.stations[clampedIndex - 1];
		const currentStage: Stage = {
			id: station.id,
			strollId: this.demoTour.id,
			orderIndex: clampedIndex,
			name: station.name,
			description: this.demoTour.description,
			address: station.address,
			latitude: station.latitude,
			longitude: station.longitude
		};
		const stroll: Stroll = {
			id: this.demoTour.id,
			name: this.demoTour.title,
			authorId: 'demo-author',
			activeStatus: 'published',
			labels: [this.demoTour.category],
			description: this.demoTour.description,
			publicityFlag: 'public',
			stageCount: this.demoTour.stations.length,
			createdAt: this.demoAdventure.purchaseTime,
			updatedAt: this.demoAdventure.purchaseTime
		};

		return { adventure: { ...this.demoAdventure }, stroll, currentStage };
	}

	private createDemoAdventure(): Adventure {
		const now = new Date().toISOString();

		return {
			id: this.adventureId || 'demo-adventure',
			ownerUserId: 'demo-user',
			strollId: this.demoTour.id,
			purchaseTime: now,
			startDateTime: now,
			completionDateTime: null,
			progressStatus: 'in_progress',
			currentStageIndex: 1
		};
	}
}
