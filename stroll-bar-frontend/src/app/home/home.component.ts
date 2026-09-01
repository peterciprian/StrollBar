import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, map, of } from 'rxjs';

import { StrollCardComponent } from '../components/stroll-card/stroll-card.component';
import { MOCK_TOURS, Tour } from '../core/models/screens.models';
import { StrollsFeatureService } from '../features/strolls/strolls-feature.service';
import { mapStrollToTour } from '../features/strolls/stroll-mappers';

@Component({
	selector: 'app-home',
	standalone: true,
	imports: [RouterLink, UpperCasePipe, MatButtonModule, MatIconModule, StrollCardComponent, TranslatePipe],
	templateUrl: './home.component.html',
	styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
	private readonly strollsFeature = inject(StrollsFeatureService);

	protected featuredTours: Tour[] = MOCK_TOURS.slice(0, 3);

	ngOnInit(): void {
		// Calls the real strolls list endpoint; falls back to demo tours on error, empty, or missing response.
		this.strollsFeature
			.browse({ sortBy: 'most_used', limit: 3 })
			.pipe(
				map((response) => (response?.items?.length ? response.items.map((stroll) => mapStrollToTour(stroll)) : MOCK_TOURS.slice(0, 3))),
				catchError(() => of(MOCK_TOURS.slice(0, 3)))
			)
			.subscribe((tours) => {
				this.featuredTours = tours;
			});
	}
}
