import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';

import { CATEGORY_LABEL_KEYS, MOCK_USER_TOURS, USER_TOUR_STATUS_LABEL_KEYS, UserTourRow } from '../../screens.models';

@Component({
	selector: 'app-user-dashboard-screen',
	standalone: true,
	imports: [CommonModule, MatButtonModule, MatIconModule, MatTableModule, MatChipsModule, MatTooltipModule, TranslatePipe],
	templateUrl: './user-dashboard.component.html',
	styleUrls: ['./user-dashboard.component.scss']
})
export class UserDashboardScreenComponent {
	protected readonly displayedColumns = ['name', 'stations', 'category', 'status', 'actions'];
	protected readonly tours: UserTourRow[] = MOCK_USER_TOURS;
	protected readonly categoryLabelKeys = CATEGORY_LABEL_KEYS;
	protected readonly statusLabelKeys = USER_TOUR_STATUS_LABEL_KEYS;
}
