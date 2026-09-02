import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { CATEGORY_LABEL_KEYS } from '../../core/models/screens.models';

export interface StrollCardData {
	title: string;
	category: string;
	durationMinutes: number;
	price: number;
	stationsCount?: number;
	stations?: unknown[];
	publicityFlag?: 'public' | 'unlisted' | 'private';
	coverImageUrl?: string;
	coverFallback?: string;
}

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

	protected readonly categoryLabelKeys: Record<string, string> = CATEGORY_LABEL_KEYS;
}
