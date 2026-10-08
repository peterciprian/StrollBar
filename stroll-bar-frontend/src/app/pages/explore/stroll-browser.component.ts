import { Component, ChangeDetectorRef, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { catchError, firstValueFrom, map, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { StrollCardComponent } from '../../components/stroll-card/stroll-card.component';
import { StrollCategory, StrollReview, StrollSortOption, StrollSummary } from '../../core/api/models';
import { SbStarRatingComponent } from '../../components/atoms/sb-star-rating/sb-star-rating.component';
import { StrollsFeatureService } from '../../features/strolls/strolls-feature.service';
import { AdventuresFeatureService } from '../../features/adventures/adventures-feature.service';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { NotificationService } from '../../core/services/notification.service';
import { ReportProblemDialogComponent } from '../../shared/report-problem-dialog/report-problem-dialog.component';
import { MockPaymentDialogComponent } from './mock-payment-dialog.component';
import { extractErrorCode } from '../../core/utils/http-error.util';
import { AppErrorCode } from '../../core/models/app-error-code';
import { SbAlertComponent } from '../../components/atoms/sb-alert/sb-alert.component';
import { SbButtonComponent } from '../../components/atoms/sb-button/sb-button.component';
import { SbIconComponent } from '../../components/atoms/sb-icon/sb-icon.component';
import { SbIconButtonComponent } from '../../components/atoms/sb-icon-button/sb-icon-button.component';
import { SbSearchFieldComponent } from '../../components/atoms/sb-search-field/sb-search-field.component';
import { SbSelectComponent, SbSelectOption } from '../../components/atoms/sb-select/sb-select.component';

type CategoryFilter = StrollCategory | 'ALL';

const VISIBLE_REVIEW_COUNT = 3;

@Component({
	selector: 'app-stroll-browser-screen',
	standalone: true,
	imports: [
		CommonModule,
		UpperCasePipe,
		FormsModule,
		MatDialogModule,
		SbAlertComponent,
		SbButtonComponent,
		SbIconComponent,
		SbIconButtonComponent,
		SbSearchFieldComponent,
		SbSelectComponent,
		TranslatePipe,
		StrollCardComponent,
		SbStarRatingComponent
	],
	templateUrl: './stroll-browser.component.html',
	styleUrls: ['./stroll-browser.component.scss']
})
export class StrollBrowserScreenComponent implements OnInit {
	private readonly strollsFeature = inject(StrollsFeatureService);
	private readonly adventuresFeature = inject(AdventuresFeatureService);
	private readonly tokenStorage = inject(TokenStorageService);
	private readonly notification = inject(NotificationService);
	private readonly translate = inject(TranslateService);
	private readonly dialog = inject(MatDialog);
	private readonly router = inject(Router);
	private readonly route = inject(ActivatedRoute);
	private readonly destroyRef = inject(DestroyRef);
	private readonly cdr = inject(ChangeDetectorRef);

	protected readonly categories: CategoryFilter[] = ['ALL', ...Object.values(StrollCategory)];
	protected readonly sortOptions: StrollSortOption[] = ['newest', 'most_popular', 'top_rated', 'nearest'];
	protected strolls: StrollSummary[] = [];

	protected searchTerm = '';
	protected activeCategory: CategoryFilter = 'ALL';
	protected sortBy: StrollSortOption = 'newest';
	protected selectedStroll: StrollSummary | null = null;
	protected readonly startingAdventure = signal(false);
	protected readonly startAdventureError = signal<string | null>(null);
	protected readonly locatingUser = signal(false);
	protected readonly locationError = signal(false);
	protected reviews: StrollReview[] = [];
	protected showAllReviews = false;
	private userLocation: { latitude: number; longitude: number } | null = null;
	private requestedStrollId: string | null = null;
	private readonly requestedDetailIds = new Set<string>();

	ngOnInit(): void {
		this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
			this.requestedStrollId = params.get('strollId');
			if (this.strolls.length) this.syncSelectionFromUrl();
		});
		this.loadStrolls();
	}

	protected get filteredStrolls(): StrollSummary[] {
		return this.strolls.filter((stroll) => {
			const matchesCategory = this.activeCategory === 'ALL' || stroll.category === this.activeCategory;
			const matchesSearch = stroll.name.toLowerCase().includes(this.searchTerm.trim().toLowerCase());
			return matchesCategory && matchesSearch;
		});
	}

	protected selectCategory(category: CategoryFilter): void {
		this.activeCategory = category;
	}

	protected categoryLabelKey(category: CategoryFilter): string {
		return category === 'ALL' ? 'SCREENS.CATEGORY_ALL' : `SCREENS.CATEGORY_${category}`;
	}

	protected sortLabelKey(sort: StrollSortOption): string {
		return `SCREENS.STROLL_BROWSER.SORT_${sort.toUpperCase()}`;
	}

	protected get sortSelectOptions(): SbSelectOption<StrollSortOption>[] {
		return this.sortOptions.map((sort) => ({ value: sort, label: this.translate.instant(this.sortLabelKey(sort)) }));
	}

	protected async changeSort(sort: StrollSortOption): Promise<void> {
		this.sortBy = sort;
		this.locationError.set(false);

		if (sort === 'nearest' && !this.userLocation) {
			this.userLocation = await this.requestUserLocation();
			if (!this.userLocation) {
				this.sortBy = 'newest';
				this.locationError.set(true);
			}
		}

		this.loadStrolls();
	}

	protected selectStrollCard(stroll: StrollSummary): void {
		this.applySelectedStroll(stroll);
		void this.router.navigate([], {
			relativeTo: this.route,
			queryParams: { strollId: stroll.id },
			queryParamsHandling: 'merge',
			replaceUrl: true
		});
	}

	protected calculateDuration(stroll: StrollSummary): number {
		const walkingSpeed = 3;
		return (stroll.length / walkingSpeed) * 60 + stroll.stageCount * 10;
	}

	protected get visibleReviews(): StrollReview[] {
		return this.showAllReviews ? this.reviews : this.reviews.slice(0, VISIBLE_REVIEW_COUNT);
	}

	protected get hasMoreReviews(): boolean {
		return this.reviews.length > VISIBLE_REVIEW_COUNT;
	}

	protected toggleReviews(): void {
		this.showAllReviews = !this.showAllReviews;
	}

	protected async reportProblem(): Promise<void> {
		if (!this.selectedStroll) {
			return;
		}

		if (!this.tokenStorage.getAccessToken()) {
			await this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/explore' } });
			return;
		}

		const message = await firstValueFrom(
			this.dialog
				.open(ReportProblemDialogComponent, {
					data: { strollName: this.selectedStroll.name },
					maxWidth: 'calc(100vw - 32px)',
					width: '480px'
				})
				.afterClosed()
		);

		if (!message) {
			return;
		}

		this.strollsFeature.report(this.selectedStroll.id, { message }).subscribe({
			next: () => this.notification.showSuccess(this.translate.instant('SHARED.REPORT_PROBLEM.SUBMITTED')),
			error: () => this.notification.showError(this.translate.instant('SHARED.REPORT_PROBLEM.SUBMIT_ERROR'))
		});
	}

	private loadReviews(strollId: string): void {
		this.reviews = [];
		this.showAllReviews = false;
		this.strollsFeature
			.listReviews(strollId)
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				catchError(() => of({ items: [] as StrollReview[], ratingAverage: 0, ratingCount: 0 }))
			)
			.subscribe((response) => {
				this.reviews = response.items;
				this.cdr.detectChanges();
			});
	}

	protected async startAdventure(): Promise<void> {
		if (this.startingAdventure() || !this.selectedStroll) {
			return;
		}

		if (!this.tokenStorage.getAccessToken()) {
			await this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/explore' } });
			return;
		}

		const confirmed = await firstValueFrom(
			this.dialog
				.open(MockPaymentDialogComponent, {
					data: { strollName: this.selectedStroll.name, price: this.selectedStroll.price?.amount ?? 0 },
					maxWidth: 'calc(100vw - 32px)',
					width: '420px'
				})
				.afterClosed()
		);

		if (!confirmed) {
			return;
		}

		this.startingAdventure.set(true);
		this.startAdventureError.set(null);

		try {
			const adventure = await firstValueFrom(this.adventuresFeature.unlock(this.selectedStroll.id));
			await firstValueFrom(this.adventuresFeature.start(adventure.id));
			await this.router.navigate(['/adventure', adventure.id]);
		} catch (error) {
			this.startAdventureError.set(this.resolveStartErrorKey(error));
		} finally {
			this.startingAdventure.set(false);
		}
	}

	private resolveStartErrorKey(error: unknown): string {
		switch (extractErrorCode(error)) {
			case AppErrorCode.EMAIL_NOT_VERIFIED:
				return 'ERRORS.EMAIL_NOT_VERIFIED';
			case AppErrorCode.PURCHASE_QUOTA_REACHED:
				return 'ERRORS.PURCHASE_QUOTA_REACHED';
			default:
				return 'SCREENS.STROLL_BROWSER.START_ERROR';
		}
	}

	private requestUserLocation(): Promise<{ latitude: number; longitude: number } | null> {
		if (!navigator.geolocation) return Promise.resolve(null);
		this.locatingUser.set(true);
		this.cdr.detectChanges();
		return new Promise((resolve) => {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					this.locatingUser.set(false);
					resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude });
				},
				() => {
					this.locatingUser.set(false);
					resolve(null);
				},
				{ timeout: 10000, maximumAge: 300000 }
			);
		});
	}

	private loadStrolls(): void {
		// Calls the real strolls list endpoint.
		this.strollsFeature
			.browse({
				sortBy: this.sortBy,
				...(this.sortBy === 'nearest' && this.userLocation
					? { userLatitude: this.userLocation.latitude, userLongitude: this.userLocation.longitude }
					: {})
			})
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				map((response) => response?.items ?? []),
				catchError(() => of([] as StrollSummary[]))
			)
			.subscribe((strolls) => {
				const requestedStroll = this.requestedStrollId
					? (strolls.find((stroll) => stroll.id === this.requestedStrollId) ??
						(this.selectedStroll?.id === this.requestedStrollId ? this.selectedStroll : null))
					: null;
				this.strolls =
					requestedStroll && !strolls.some((stroll) => stroll.id === requestedStroll.id) ? [requestedStroll, ...strolls] : strolls;
				if (requestedStroll) {
					this.applySelectedStroll(requestedStroll);
				} else if (this.requestedStrollId) {
					this.applySelectedStroll(null);
					this.loadRequestedStroll(this.requestedStrollId);
				} else {
					this.applySelectedStroll(this.strolls[0] ?? null);
				}
				// HTTP subscribe callbacks in this app don't reliably re-enter Angular's zone, so force a refresh.
				this.cdr.detectChanges();
			});
	}

	private syncSelectionFromUrl(): void {
		if (!this.requestedStrollId) {
			this.applySelectedStroll(this.strolls[0] ?? null);
			return;
		}

		const requestedStroll = this.strolls.find((stroll) => stroll.id === this.requestedStrollId);
		if (requestedStroll) {
			this.applySelectedStroll(requestedStroll);
			return;
		}

		this.applySelectedStroll(null);
		this.loadRequestedStroll(this.requestedStrollId);
	}

	private loadRequestedStroll(strollId: string): void {
		if (this.requestedDetailIds.has(strollId)) return;
		this.requestedDetailIds.add(strollId);
		this.strollsFeature
			.getDetail(strollId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (response) => {
					const stroll = response.stroll;
					if (!this.strolls.some((item) => item.id === strollId)) this.strolls = [stroll, ...this.strolls];
					if (this.requestedStrollId === strollId) this.applySelectedStroll(stroll);
					this.cdr.detectChanges();
				},
				error: () => {
					if (this.requestedStrollId === strollId) {
						this.requestedStrollId = null;
						this.applySelectedStroll(this.strolls[0] ?? null);
						void this.router.navigate([], {
							relativeTo: this.route,
							queryParams: { strollId: null },
							queryParamsHandling: 'merge',
							replaceUrl: true
						});
					}
					this.cdr.detectChanges();
				}
			});
	}

	private applySelectedStroll(stroll: StrollSummary | null): void {
		if (this.selectedStroll?.id === stroll?.id) return;
		this.selectedStroll = stroll;
		this.startAdventureError.set(null);
		this.reviews = [];
		this.showAllReviews = false;
		if (stroll) this.loadReviews(stroll.id);
	}
}
