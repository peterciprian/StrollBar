import { Component, ChangeDetectorRef, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { StageLocationMapComponent } from '../../pages/creator/stage-location-map.component';
import { MediaGalleryComponent } from '../../components/media-gallery/media-gallery.component';
import { AdventuresFeatureService } from '../../features/adventures/adventures-feature.service';
import { StrollsFeatureService } from '../../features/strolls/strolls-feature.service';
import { NotificationService } from '../../core/services/notification.service';
import { ReportProblemDialogComponent } from '../../shared/report-problem-dialog/report-problem-dialog.component';
import { Adventure, AdventureDetailResponse, AdventureNavigateDirection, Stage, Stroll } from '../../core/api/models';

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
		MatDialogModule,
		MatProgressBarModule,
		MatTooltipModule,
		TranslatePipe,
		StageLocationMapComponent,
		MediaGalleryComponent
	],
	templateUrl: './adventure.component.html',
	styleUrls: ['./adventure.component.scss']
})
export class AdventureScreenComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly adventuresFeature = inject(AdventuresFeatureService);
	private readonly strollsFeature = inject(StrollsFeatureService);
	private readonly notification = inject(NotificationService);
	private readonly translate = inject(TranslateService);
	private readonly dialog = inject(MatDialog);
	private readonly cdr = inject(ChangeDetectorRef);
	private readonly destroyRef = inject(DestroyRef);

	protected adventureId = this.route.snapshot.paramMap.get('adventureId') ?? '';

	protected loading = true;
	protected currentStage: Stage | null = null;
	protected currentStageIndex = 1;
	protected totalStages = 1;
	protected stroll: Stroll | null = null;

	protected answer = '';
	protected submitted = false;
	protected feedbackCorrect = false;

	ngOnInit(): void {
		// Same route path is reused across adventures, so react to param changes instead of just the initial snapshot.
		this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
			this.adventureId = params.get('adventureId') ?? '';
			this.loadAdventure();
		});
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
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (result) => this.applyAnswerResult(result),
				error: () => this.cdr.detectChanges()
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
		this.adventuresFeature
			.navigate(this.adventureId, direction)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (detail) => this.applyDetail(detail),
				error: () => (this.loading = false)
			});
	}

	private loadAdventure(): void {
		this.loading = true;

		// Calls the real "get adventure by id" endpoint.
		this.adventuresFeature
			.get(this.adventureId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (detail) => {
					this.loading = false;
					this.applyDetail(detail);
				},
				error: () => {
					this.loading = false;
					this.currentStage = null;
				}
			});
	}

	private reloadCurrentStage(): void {
		this.adventuresFeature
			.get(this.adventureId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (detail) => this.applyDetail(detail),
				error: () => this.cdr.detectChanges()
			});
	}

	private applyDetail(detail: AdventureDetailResponse): void {
		this.currentStage = detail.currentStage;
		this.currentStageIndex = detail.adventure.currentStageIndex;
		this.totalStages = detail.stroll?.stageCount ?? this.totalStages;
		this.stroll = detail.stroll ?? this.stroll;
		if (detail.adventure.progressStatus === 'completed' || this.currentStageIndex >= this.totalStages) {
			this.currentStageIndex = this.totalStages;
		}
		this.answer = '';
		this.submitted = false;

		// HTTP error callbacks in this app don't reliably re-enter Angular's zone, so force a refresh.
		this.cdr.detectChanges();
	}

	protected async reportProblem(): Promise<void> {
		if (!this.stroll) {
			return;
		}

		const message = await firstValueFrom(
			this.dialog
				.open(ReportProblemDialogComponent, {
					data: { strollName: this.stroll.name },
					maxWidth: 'calc(100vw - 32px)',
					width: '480px'
				})
				.afterClosed()
		);

		if (!message) {
			return;
		}

		this.strollsFeature.report(this.stroll.id, { message }).subscribe({
			next: () => this.notification.showSuccess(this.translate.instant('SHARED.REPORT_PROBLEM.SUBMITTED')),
			error: () => this.notification.showError(this.translate.instant('SHARED.REPORT_PROBLEM.SUBMIT_ERROR'))
		});
	}
}
