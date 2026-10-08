import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

import { StrollCategory, StrollSummary } from '../../core/api/models';
import { SbCardComponent } from '../atoms/sb-card/sb-card.component';
import { SbIconComponent } from '../atoms/sb-icon/sb-icon.component';
import { SbStarRatingComponent } from '../atoms/sb-star-rating/sb-star-rating.component';
import { SbBadgeComponent } from '../atoms/sb-badge/sb-badge.component';

export type StrollCardData = StrollSummary;

@Component({
	selector: 'app-stroll-card',
	standalone: true,
	imports: [CommonModule, TranslatePipe, SbCardComponent, SbIconComponent, SbStarRatingComponent, SbBadgeComponent],
	templateUrl: './stroll-card.component.html',
	styleUrls: ['./stroll-card.component.scss']
})
export class StrollCardComponent {
	@Input() stroll: StrollCardData | null = null;
	@Input() selected = false;
	@Output() cardClick = new EventEmitter<void>();

	protected categoryLabelKey(category: StrollCategory): string {
		return `SCREENS.CATEGORY_${category}`;
	}
}
