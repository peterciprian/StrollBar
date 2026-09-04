import { Component, ChangeDetectorRef, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, firstValueFrom, map, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { StrollCardComponent } from '../../components/stroll-card/stroll-card.component';
import { StrollCategory, StrollReview, StrollSortOption, StrollSummary } from '../../core/api/models';
import { StarRatingComponent } from '../../shared/star-rating.component';
import { StrollsFeatureService } from '../../features/strolls/strolls-feature.service';
import { AdventuresFeatureService } from '../../features/adventures/adventures-feature.service';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { MockPaymentDialogComponent } from './mock-payment-dialog.component';

type CategoryFilter = StrollCategory | 'ALL';

const VISIBLE_REVIEW_COUNT = 3;

@Component({
	selector: 'app-stroll-browser-screen',
	standalone: true,
	imports: [
		CommonModule,
		UpperCasePipe,
		FormsModule,
		MatFormFieldModule,
		MatInputModule,
		MatSelectModule,
		MatIconModule,
		MatButtonModule,
		MatDialogModule,
		TranslatePipe,
		StrollCardComponent,
		StarRatingComponent
	],
	templateUrl: './stroll-browser.component.html',
	styleUrls: ['./stroll-browser.component.scss']
})
export class StrollBrowserScreenComponent implements OnInit {
	private readonly strollsFeature = inject(StrollsFeatureService);
	private readonly adventuresFeature = inject(AdventuresFeatureService);
	private readonly tokenStorage = inject(TokenStorageService);
	private readonly dialog = inject(MatDialog);
	private readonly router = inject(Router);
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
	protected readonly startAdventureError = signal(false);
	protected readonly locatingUser = signal(false);
	protected readonly locationError = signal(false);
	protected reviews: StrollReview[] = [];
	protected showAllReviews = false;
	private userLocation: { latitude: number; longitude: number } | null = null;

	ngOnInit(): void {
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
		this.selectedStroll = stroll;
		this.startAdventureError.set(false);
		this.loadReviews(stroll.id);
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
		this.startAdventureError.set(false);

		try {
			const adventure = await firstValueFrom(this.adventuresFeature.unlock(this.selectedStroll.id));
			await firstValueFrom(this.adventuresFeature.start(adventure.id));
			await this.router.navigate(['/adventure', adventure.id]);
		} catch {
			this.startAdventureError.set(true);
		} finally {
			this.startingAdventure.set(false);
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
				this.strolls = strolls;
				this.selectedStroll = this.strolls[0] ?? null;
				// HTTP subscribe callbacks in this app don't reliably re-enter Angular's zone, so force a refresh.
				this.cdr.detectChanges();
				if (this.selectedStroll) this.loadReviews(this.selectedStroll.id);
			});
	}
}
