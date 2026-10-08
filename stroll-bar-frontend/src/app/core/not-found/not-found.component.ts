import { Component, OnInit, inject } from '@angular/core';
import { Location } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { SbButtonComponent } from '../../components/atoms/sb-button/sb-button.component';

@Component({
	selector: 'app-not-found',
	standalone: true,
	imports: [TranslatePipe, SbButtonComponent],
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
