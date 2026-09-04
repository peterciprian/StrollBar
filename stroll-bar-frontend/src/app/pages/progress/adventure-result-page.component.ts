import { Component, ChangeDetectorRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AdventuresFeatureService } from '../../features/adventures/adventures-feature.service';
import { StrollsFeatureService } from '../../features/strolls/strolls-feature.service';
import { AdventureResultResponse } from '../../core/api/models';
import { formatDuration } from '../../core/utils/duration.util';
import { StarRatingComponent } from '../../shared/star-rating.component';

@Component({
	selector: 'app-adventure-result-page',
	standalone: true,
	imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, TranslatePipe, StarRatingComponent],
	templateUrl: './adventure-result-page.component.html',
	styleUrls: ['./adventure-result-page.component.scss']
})
export class AdventureResultPageComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly adventuresFeature = inject(AdventuresFeatureService);
	private readonly strollsFeature = inject(StrollsFeatureService);
	private readonly cdr = inject(ChangeDetectorRef);
	private readonly translate = inject(TranslateService);
	protected loading = true;
	protected result: AdventureResultResponse | null = null;
	protected error = false;
	protected reviewRating = 0;
	protected reviewComment = '';
	protected reviewSaving = false;
	protected reviewSaved = false;
	protected reviewError = false;

	ngOnInit(): void {
		const adventureId = this.route.snapshot.paramMap.get('adventureId') ?? '';
		this.adventuresFeature.getResult(adventureId).subscribe({
			next: (result) => {
				this.result = result;
				this.loading = false;
				this.cdr.detectChanges();
				this.loadExistingReview();
			},
			error: () => {
				this.error = true;
				this.loading = false;
				this.cdr.detectChanges();
			}
		});
	}

	protected get canReview(): boolean {
		return !!this.result?.stroll && this.result.adventure.progressStatus === 'completed';
	}

	protected submitReview(): void {
		const strollId = this.result?.stroll?.id;
		if (!strollId || !this.reviewRating || this.reviewSaving) return;
		this.reviewSaving = true;
		this.reviewError = false;
		this.reviewSaved = false;
		this.strollsFeature.submitReview(strollId, { rating: this.reviewRating, comment: this.reviewComment.trim() || undefined }).subscribe({
			next: () => {
				this.reviewSaving = false;
				this.reviewSaved = true;
				this.cdr.detectChanges();
			},
			error: () => {
				this.reviewSaving = false;
				this.reviewError = true;
				this.cdr.detectChanges();
			}
		});
	}

	private loadExistingReview(): void {
		const strollId = this.result?.stroll?.id;
		if (!strollId || !this.canReview) return;
		this.strollsFeature.getMyReview(strollId).subscribe({
			next: (review) => {
				if (review) {
					this.reviewRating = review.rating;
					this.reviewComment = review.comment ?? '';
				}
				this.cdr.detectChanges();
			},
			error: () => this.cdr.detectChanges()
		});
	}

	protected formatTime(totalSeconds: number): string {
		return formatDuration(totalSeconds, (key, params) => this.translate.instant(key, params));
	}

	protected backToAdventures(): void {
		void this.router.navigate(['/user-dashboard']);
	}
}
