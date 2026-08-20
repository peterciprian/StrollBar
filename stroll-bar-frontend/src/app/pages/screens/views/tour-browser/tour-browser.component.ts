import { Component } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';

import { StrollCardComponent } from '../../../../components/stroll-card/stroll-card.component';
import { StageCardComponent } from '../../../../components/stage/stage-card.component';
import { CATEGORY_LABEL_KEYS, MOCK_TOURS, Tour, TourCategory } from '../../screens.models';

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
		MatChipsModule,
		MatButtonModule,
		TranslatePipe,
		StrollCardComponent,
		StageCardComponent
	],
	templateUrl: './tour-browser.component.html',
	styleUrls: ['./tour-browser.component.scss']
})
export class TourBrowserScreenComponent {
	protected readonly categories: CategoryFilter[] = ['All', 'Historical', 'Mystery', 'Cultural'];
	protected readonly categoryLabelKeys = CATEGORY_LABEL_KEYS;
	protected readonly tours: Tour[] = MOCK_TOURS;

	protected searchTerm = '';
	protected activeCategory: CategoryFilter = 'All';
	protected selectedTour: Tour = this.tours[0];

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
	}
}
