import { Component } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';

import { AdminTourRow, CATEGORY_LABEL_KEYS, MOCK_ADMIN_TOURS, TOUR_STATUS_LABEL_KEYS } from '../../../core/models/screens.models';

@Component({
	selector: 'app-admin-tour-list-screen',
	standalone: true,
	imports: [CommonModule, UpperCasePipe, MatButtonModule, MatIconModule, MatTableModule, MatChipsModule, MatTooltipModule, TranslatePipe],
	templateUrl: './admin-tour-list.component.html',
	styleUrls: ['./admin-tour-list.component.scss']
})
export class AdminTourListScreenComponent {
	protected readonly displayedColumns = ['name', 'stations', 'category', 'price', 'status', 'actions'];
	protected readonly tours: AdminTourRow[] = MOCK_ADMIN_TOURS;
	protected readonly categoryLabelKeys = CATEGORY_LABEL_KEYS;
	protected readonly statusLabelKeys = TOUR_STATUS_LABEL_KEYS;
}
