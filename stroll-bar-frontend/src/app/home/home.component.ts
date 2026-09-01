import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { StrollCardComponent } from '../components/stroll-card/stroll-card.component';
import { MOCK_TOURS, Tour } from '../core/models/screens.models';
import { StrollsFeatureService } from '../features/strolls/strolls-feature.service';
import { mapStrollToTour } from '../features/strolls/stroll-mappers';
import { AsyncLoadingState } from '../core/utils/async-loading-state.util';

@Component({
	selector: 'app-home',
	standalone: true,
	imports: [RouterLink, UpperCasePipe, MatButtonModule, MatIconModule, StrollCardComponent, TranslatePipe],
	templateUrl: './home.component.html',
	styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
	private readonly strollsFeature = inject(StrollsFeatureService);

	/** Async state for featured tours loading */
	protected readonly toursState = new AsyncLoadingState<Tour[]>();

	ngOnInit(): void {
		this.loadFeaturedTours();
	}

	private loadFeaturedTours(): void {
		// Fetch featured tours from API; falls back to mock tours on error or empty response.
		// Using AsyncLoadingState to manage loading/error/data state consistently.
		this.strollsFeature.browse({ sortBy: 'most_used', limit: 3 }).subscribe({
			next: (response) => {
				const tours = response?.items?.length ? response.items.map((stroll) => mapStrollToTour(stroll)) : MOCK_TOURS.slice(0, 3);
				this.toursState.setSuccess(tours);
			},
			error: () => {
				this.toursState.setSuccess(MOCK_TOURS.slice(0, 3));
			}
		});
	}
}
