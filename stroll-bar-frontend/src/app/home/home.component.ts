import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { StrollCardComponent } from '../components/stroll-card/stroll-card.component';
import { MOCK_TOURS, Tour } from '../core/models/screens.models';

@Component({
	selector: 'app-home',
	standalone: true,
	imports: [RouterLink, UpperCasePipe, MatButtonModule, MatIconModule, StrollCardComponent, TranslatePipe],
	templateUrl: './home.component.html',
	styleUrls: ['./home.component.scss']
})
export class HomeComponent {
	protected readonly featuredTours: Tour[] = MOCK_TOURS.slice(0, 3);
}
