import { Component, ChangeDetectorRef, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslatePipe } from '@ngx-translate/core';
import { map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MapPreviewComponent } from '../../components/map-preview/map-preview.component';
import { MediaGalleryComponent } from '../../components/media-gallery/media-gallery.component';
import { AdventuresFeatureService } from '../../features/adventures/adventures-feature.service';
import { Adventure, AdventureDetailResponse, AdventureNavigateDirection, Stage, Stroll as ApiStroll, StrollCategory } from '../../core/api/models';
import { MOCK_STROLLS, Stroll as ScreenStroll } from '../../core/models/screens.models';

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
	private readonly router = inject(Router);
	private readonly adventuresFeature = inject(AdventuresFeatureService);
	private readonly cdr = inject(ChangeDetectorRef);
	private readonly destroyRef = inject(DestroyRef);
	private demoMode = false;

	protected readonly adventureId = this.route.snapshot.paramMap.get('adventureId') ?? '';

	// Stand-in stroll/adventure used only while the real endpoints have no seeded data for this id.
	private readonly demoStroll: ScreenStroll = MOCK_STROLLS[0];
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
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				map((result) => (this.isUsableAnswerResult(result) ? result : this.demoSubmitAnswer()))
			)
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
			if (result.adventure.progressStatus === 'completed' || this.currentStageIndex >= this.totalStages) {
				void this.router.navigate(['/adventure', this.adventureId, 'result']);
				return;
			}
			this.reloadCurrentStage();
		}
	}

	protected goToPreviousStage(): void {
		this.navigateStage('previous');
	}

	protected goToNextStage(): void {
		if (!this.canGoNext) {
			void this.router.navigate(['/adventure', this.adventureId, 'result']);
			return;
		}
		this.navigateStage('next');
	}

	private navigateStage(direction: AdventureNavigateDirection): void {
		if (this.demoMode) {
			this.applyDetail(this.demoNavigate(direction));
			return;
		}

		this.adventuresFeature
			.navigate(this.adventureId, direction)
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				map((detail) => (this.isUsableDetail(detail) ? detail : null))
			)
			.subscribe({
				next: (detail) => {
					if (detail) this.applyDetail(detail);
				},
				error: () => undefined
			});
	}

	private loadAdventure(): void {
		this.loading = true;

		// Calls the real "get adventure by id" endpoint; falls back to a demo stroll on error, empty, or missing response.
		// Both next and error are handled explicitly so the loading flag always clears, even if the fallback itself fails.
		this.adventuresFeature
			.get(this.adventureId)
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				map((detail) => {
					if (this.isUsableDetail(detail)) return detail;
					this.demoMode = true;
					return this.buildDemoDetail();
				})
			)
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
		if (this.demoMode) {
			this.applyDetail(this.buildDemoDetail());
			return;
		}

		this.adventuresFeature
			.get(this.adventureId)
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				map((detail) => (this.isUsableDetail(detail) ? detail : null))
			)
			.subscribe({
				next: (detail) => {
					if (detail) this.applyDetail(detail);
				},
				error: () => undefined
			});
	}

	private applyDetail(detail: AdventureDetailResponse): void {
		this.currentStage = detail.currentStage;
		this.currentStageIndex = detail.adventure.currentStageIndex;
		this.totalStages = detail.stroll?.stageCount ?? this.totalStages;
		if (detail.adventure.progressStatus === 'completed' || this.currentStageIndex >= this.totalStages) {
			this.currentStageIndex = this.totalStages;
		}
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
		const stageCount = this.demoStroll.stations.length;

		if (this.demoAdventure.currentStageIndex < stageCount) {
			this.demoAdventure.currentStageIndex += 1;
		} else {
			this.demoAdventure.completionDateTime = new Date().toISOString();
			this.demoAdventure.progressStatus = 'completed';
		}

		return { isCorrect: true, adventure: { ...this.demoAdventure }, stageId: this.currentStage?.id ?? '' };
	}

	private demoNavigate(direction: AdventureNavigateDirection): AdventureDetailResponse {
		const stageCount = this.demoStroll.stations.length;

		this.demoAdventure.currentStageIndex =
			direction === 'next'
				? Math.min(this.demoAdventure.currentStageIndex + 1, stageCount)
				: Math.max(this.demoAdventure.currentStageIndex - 1, 1);

		return this.buildDemoDetail();
	}

	private buildDemoDetail(): AdventureDetailResponse {
		const clampedIndex = Math.min(Math.max(this.demoAdventure.currentStageIndex, 1), this.demoStroll.stations.length);
		const station = this.demoStroll.stations[clampedIndex - 1];
		const currentStage: Stage = {
			id: station.id,
			strollId: this.demoStroll.id,
			orderIndex: clampedIndex,
			name: station.name,
			description: this.demoStroll.description,
			address: station.address,
			latitude: station.latitude,
			longitude: station.longitude
		};
		const stroll: ApiStroll = {
			id: this.demoStroll.id,
			name: this.demoStroll.title,
			authorId: 'demo-author',
			activeStatus: 'published',
			labels: [this.demoStroll.category],
			category: [StrollCategory.HISTORICAL],
			description: this.demoStroll.description,
			publicityFlag: 'public',
			length: this.demoStroll.distanceKm,
			stageCount: this.demoStroll.stations.length,
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
			strollId: this.demoStroll.id,
			purchaseTime: now,
			startDateTime: now,
			completionDateTime: null,
			progressStatus: 'in_progress',
			currentStageIndex: 1
		};
	}
}
