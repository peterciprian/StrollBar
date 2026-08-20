import { Component, OnInit, inject } from '@angular/core';
import { Location } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
	// tslint:disable-next-line:component-selector
	selector: 'not-found',
	standalone: true,
	imports: [TranslatePipe],
	templateUrl: './not-found.component.html'
})
export class NotFoundComponent implements OnInit {
	private location = inject(Location);

	public ngOnInit(): void {
		// EMPTY NOW
	}

	public navigateBack(): void {
		this.location.back();
	}
}
