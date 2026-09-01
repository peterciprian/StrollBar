import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, firstValueFrom, map, of } from 'rxjs';

import { StrollCardComponent } from '../../components/stroll-card/stroll-card.component';
import { StageCardComponent } from '../../components/stage/stage-card.component';
import { CATEGORY_LABEL_KEYS, MOCK_TOURS, Tour, TourCategory } from '../../core/models/screens.models';
import { StrollsFeatureService } from '../../features/strolls/strolls-feature.service';
import { mapStageToTourStation, mapStrollToTour } from '../../features/strolls/stroll-mappers';
import { AdventuresFeatureService } from '../../features/adventures/adventures-feature.service';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { MockPaymentDialogComponent } from './mock-payment-dialog.component';

type CategoryFilter = TourCategory | 'All';

@Component({
	selector: 'app-tour-browser-screen',
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
		TranslatePipe,
		StrollCardComponent,
		StageCardComponent
	],
	templateUrl: './tour-browser.component.html',
	styleUrls: ['./tour-browser.component.scss']
})
export class TourBrowserScreenComponent implements OnInit {
	private readonly strollsFeature = inject(StrollsFeatureService);
	private readonly adventuresFeature = inject(AdventuresFeatureService);
	private readonly tokenStorage = inject(TokenStorageService);
	private readonly dialog = inject(MatDialog);
	private readonly router = inject(Router);

	protected readonly categories: CategoryFilter[] = ['All', 'Historical', 'Mystery', 'Cultural'];
	protected readonly categoryLabelKeys = CATEGORY_LABEL_KEYS;
	protected tours: Tour[] = MOCK_TOURS;

	protected searchTerm = '';
	protected activeCategory: CategoryFilter = 'All';
	protected selectedTour: Tour = this.tours[0];
	protected readonly startingAdventure = signal(false);
	protected readonly startAdventureError = signal(false);

	ngOnInit(): void {
		this.loadTours();
	}

	protected get filteredTours(): Tour[] {
		return this.tours.filter((tour) => {
			const matchesCategory = this.activeCategory === 'All' || tour.category === this.activeCategory;
			const matchesSearch = tour.title.toLowerCase().includes(this.searchTerm.trim().toLowerCase());
			return matchesCategory && matchesSearch;
		});
	}

	protected selectCategory(category: CategoryFilter): void {
		this.activeCategory = category;
	}

	protected selectTourCard(tour: Tour): void {
		this.selectedTour = tour;
		this.startAdventureError.set(false);
		this.loadStations(tour);
	}

	protected async startAdventure(): Promise<void> {
		if (this.startingAdventure()) {
			return;
		}

		if (!this.tokenStorage.getAccessToken()) {
			await this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/explore' } });
			return;
		}

		const confirmed = await firstValueFrom(
			this.dialog
				.open(MockPaymentDialogComponent, {
					data: { tourName: this.selectedTour.title, price: this.selectedTour.price },
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
			const adventure = await firstValueFrom(this.adventuresFeature.unlock(this.selectedTour.id));
			await firstValueFrom(this.adventuresFeature.start(adventure.id));
			await this.router.navigate(['/adventure', adventure.id]);
		} catch {
			this.startAdventureError.set(true);
		} finally {
			this.startingAdventure.set(false);
		}
	}

	private loadTours(): void {
		// Calls the real strolls list endpoint; falls back to demo tours on error, empty, or missing response.
		this.strollsFeature
			.browse({ sortBy: 'most_used' })
			.pipe(
				map((response) => (response?.items?.length ? response.items.map((stroll) => mapStrollToTour(stroll)) : MOCK_TOURS)),
				catchError(() => of(MOCK_TOURS))
			)
			.subscribe((tours) => {
				this.tours = tours;
				this.selectTourCard(this.tours[0]);
			});
	}

	private loadStations(tour: Tour): void {
		// Demo tours already carry their mock stations; only real strolls need their stages fetched.
		if (tour.stations.length || MOCK_TOURS.some((mockTour) => mockTour.id === tour.id)) {
			return;
		}

		this.strollsFeature
			.getDetail(tour.id)
			.pipe(
				map((detail) => (detail?.stages?.length ? detail.stages.map(mapStageToTourStation) : tour.stations)),
				catchError(() => of(tour.stations))
			)
			.subscribe((stations) => {
				if (this.selectedTour.id === tour.id) {
					this.selectedTour = { ...this.selectedTour, stations };
				}
			});
	}
}
