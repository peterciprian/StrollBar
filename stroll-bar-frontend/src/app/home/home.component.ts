import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { StrollCardComponent } from '../components/stroll-card/stroll-card.component';
import { StrollSummary } from '../core/api/models';
import { StrollsFeatureService } from '../features/strolls/strolls-feature.service';
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
	protected readonly strollsState = new AsyncLoadingState<StrollSummary[]>();

	ngOnInit(): void {
		this.loadFeaturedStrolls();
	}

	private loadFeaturedStrolls(): void {
		// Load featured strolls from the API and keep the page honest when the service is unavailable.
		this.strollsFeature.browse({ sortBy: 'most_popular', limit: 3 }).subscribe({
			next: (response) => {
				this.strollsState.setSuccess(response?.items ?? []);
			},
			error: () => {
				this.strollsState.setError('Failed to load featured strolls.');
			}
		});
	}
}
