import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { StrollCategory, StrollSummary } from '../../core/api/models';

export type StrollCardData = StrollSummary;

@Component({
	selector: 'app-stroll-card',
	standalone: true,
	imports: [CommonModule, MatCardModule, MatIconModule, TranslatePipe],
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
