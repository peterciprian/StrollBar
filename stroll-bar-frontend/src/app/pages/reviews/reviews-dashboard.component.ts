import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { MyReviewListEntry } from '../../core/api/models';
import { ReviewsFeatureService } from '../../features/reviews/reviews-feature.service';
import { ConfirmDeleteDialogComponent } from '../../shared/confirm-delete-dialog.component';
import { SbButtonComponent } from '../../components/atoms/sb-button/sb-button.component';
import { SbIconButtonComponent } from '../../components/atoms/sb-icon-button/sb-icon-button.component';
import { SbPageHeaderComponent } from '../../components/atoms/sb-page-header/sb-page-header.component';
import { SbCellDirective } from '../../components/atoms/sb-table/sb-cell.directive';
import { SbTableComponent } from '../../components/atoms/sb-table/sb-table.component';
import { SbTableColumn } from '../../components/atoms/sb-table/sb-table.models';
import { SbIconComponent } from '../../components/atoms/sb-icon/sb-icon.component';

@Component({
	selector: 'app-reviews-dashboard-screen',
	standalone: true,
	imports: [
		DatePipe,
		TranslatePipe,
		SbButtonComponent,
		SbCellDirective,
		SbIconButtonComponent,
		SbIconComponent,
		SbPageHeaderComponent,
		SbTableComponent
	],
	templateUrl: './reviews-dashboard.component.html',
	styleUrls: ['./reviews-dashboard.component.scss']
})
export class ReviewsDashboardScreenComponent implements OnInit {
	private readonly reviewsFeature = inject(ReviewsFeatureService);
	private readonly dialog = inject(MatDialog);
	private readonly router = inject(Router);
	private readonly destroyRef = inject(DestroyRef);
	private readonly translate = inject(TranslateService);

	protected readonly reviews = signal<MyReviewListEntry[]>([]);
	protected readonly loading = signal(true);
	protected readonly loadError = signal(false);
	protected readonly columns = computed(() => {
		this.translate.currentLang();
		return [
			{ key: 'stroll', header: this.translate.instant('REVIEWS_DASHBOARD.COL_STROLL') },
			{ key: 'rating', header: this.translate.instant('REVIEWS_DASHBOARD.COL_RATING'), align: 'center' },
			{ key: 'comment', header: this.translate.instant('REVIEWS_DASHBOARD.COL_COMMENT') },
			{ key: 'date', header: this.translate.instant('REVIEWS_DASHBOARD.COL_DATE'), hideBelow: 'sm' },
			{ key: 'actions', header: this.translate.instant('REVIEWS_DASHBOARD.COL_ACTIONS'), align: 'end' }
		] satisfies SbTableColumn<MyReviewListEntry>[];
	});

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
		if (!entry.review.adventureId) return;
		this.router.navigate(['/adventure', entry.review.adventureId, 'result']);
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
