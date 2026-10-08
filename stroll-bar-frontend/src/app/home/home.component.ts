import { Component, OnInit, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

import { SbAlertComponent } from '../components/atoms/sb-alert/sb-alert.component';
import { SbButtonComponent } from '../components/atoms/sb-button/sb-button.component';
import { SbIconComponent } from '../components/atoms/sb-icon/sb-icon.component';
import { SbSpinnerComponent } from '../components/atoms/sb-spinner/sb-spinner.component';
import { StrollCardComponent } from '../components/stroll-card/stroll-card.component';
import { StrollSummary } from '../core/api/models';
import { StrollsFeatureService } from '../features/strolls/strolls-feature.service';
import { AsyncLoadingState } from '../core/utils/async-loading-state.util';
import { selectIsLoggedIn } from '../features/auth/auth.state';

@Component({
	selector: 'app-home',
	standalone: true,
	imports: [UpperCasePipe, SbAlertComponent, SbButtonComponent, SbIconComponent, SbSpinnerComponent, StrollCardComponent, TranslatePipe],
	templateUrl: './home.component.html',
	styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
	private readonly strollsFeature = inject(StrollsFeatureService);
	private readonly router = inject(Router);
	private readonly store = inject(Store);
	protected readonly isLoggedIn = this.store.selectSignal(selectIsLoggedIn);

	/** Async state for featured strolls loading */
	protected readonly strollsState = new AsyncLoadingState<StrollSummary[]>();

	ngOnInit(): void {
		this.loadFeaturedStrolls();
	}

	protected openStroll(strollId: string): void {
		void this.router.navigate(['/explore'], { queryParams: { strollId } });
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
