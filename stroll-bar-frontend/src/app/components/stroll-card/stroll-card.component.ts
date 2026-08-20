import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { CATEGORY_LABEL_KEYS } from '../../pages/screens/screens.models';

export interface StrollCardData {
	title: string;
	category: string;
	durationMinutes: number;
	price: number;
	stationsCount?: number;
	stations?: unknown[];
	heroGradient?: string;
}

@Component({
	selector: 'app-stroll-card',
	standalone: true,
	imports: [CommonModule, MatCardModule, MatChipsModule, MatIconModule, TranslatePipe],
	templateUrl: './stroll-card.component.html',
	styleUrls: ['./stroll-card.component.scss']
})
export class StrollCardComponent {
	@Input() tour: StrollCardData | null = null;
	@Input() selected = false;
	@Output() cardClick = new EventEmitter<void>();

	protected readonly categoryLabelKeys: Record<string, string> = CATEGORY_LABEL_KEYS;
}
