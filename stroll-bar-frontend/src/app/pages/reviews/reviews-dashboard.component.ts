import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { MyReviewListEntry } from '../../core/api/models';
import { ReviewsFeatureService } from '../../features/reviews/reviews-feature.service';
import { ConfirmDeleteDialogComponent } from '../../shared/confirm-delete-dialog.component';

@Component({
	selector: 'app-reviews-dashboard-screen',
	standalone: true,
	imports: [CommonModule, MatButtonModule, MatIconModule, MatTableModule, MatTooltipModule, TranslatePipe],
	templateUrl: './reviews-dashboard.component.html',
	styleUrls: ['./reviews-dashboard.component.scss']
})
export class ReviewsDashboardScreenComponent implements OnInit {
	private readonly reviewsFeature = inject(ReviewsFeatureService);
	private readonly dialog = inject(MatDialog);
	private readonly router = inject(Router);
	private readonly destroyRef = inject(DestroyRef);

	protected readonly displayedColumns = ['stroll', 'rating', 'comment', 'date', 'actions'];
	protected readonly reviews = signal<MyReviewListEntry[]>([]);
	protected readonly loading = signal(true);
	protected readonly loadError = signal(false);

	ngOnInit(): void {
		this.reviewsFeature
			.listMine()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (entries) => {
					this.reviews.set(entries);
					this.loading.set(false);
				},
				error: () => {
					this.loadError.set(true);
					this.loading.set(false);
				}
			});
	}

	protected openStroll(entry: MyReviewListEntry): void {
		if (entry.stroll) {
			this.router.navigate(['/explore']);
		}
	}

	protected async deleteReview(entry: MyReviewListEntry): Promise<void> {
		const confirmed = await firstValueFrom(
			this.dialog
				.open(ConfirmDeleteDialogComponent, {
					data: {
						titleKey: 'REVIEWS_DASHBOARD.DELETE_CONFIRM_TITLE',
						messageKey: 'REVIEWS_DASHBOARD.DELETE_CONFIRM_MESSAGE',
						itemName: entry.stroll?.name
					},
					maxWidth: 'calc(100vw - 32px)',
					width: '420px'
				})
				.afterClosed()
		);
		if (!confirmed) return;

		const reviewId = entry.review.id;
		this.reviewsFeature.remove(reviewId).subscribe({
			next: () => this.reviews.update((reviews) => reviews.filter((review) => review.review.id !== reviewId)),
			error: () => this.loadError.set(true)
		});
	}
}
