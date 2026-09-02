import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { StrollCardComponent } from '../components/stroll-card/stroll-card.component';
import { MOCK_STROLLS, Stroll } from '../core/models/screens.models';
import { StrollsFeatureService } from '../features/strolls/strolls-feature.service';
import { mapStrollToStroll } from '../features/strolls/stroll-mappers';
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

	/** Async state for featured strolls loading */
	protected readonly strollsState = new AsyncLoadingState<Stroll[]>();

	ngOnInit(): void {
		this.loadFeaturedStrolls();
	}

	private loadFeaturedStrolls(): void {
		// Fetch featured strolls from API; falls back to mock strolls on error or empty response.
		// Using AsyncLoadingState to manage loading/error/data state consistently.
		this.strollsFeature.browse({ sortBy: 'most_used', limit: 3 }).subscribe({
			next: (response) => {
				const strolls = response?.items?.length ? response.items.map((stroll) => mapStrollToStroll(stroll)) : MOCK_STROLLS.slice(0, 3);
				this.strollsState.setSuccess(strolls);
			},
			error: () => {
				this.strollsState.setSuccess(MOCK_STROLLS.slice(0, 3));
			}
		});
	}
}
