import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
	selector: 'app-stroll-feed-page',
	standalone: true,
	imports: [CommonModule, TranslatePipe],
	templateUrl: './stroll-feed-page.component.html'
})
export class StrollFeedPageComponent {}
