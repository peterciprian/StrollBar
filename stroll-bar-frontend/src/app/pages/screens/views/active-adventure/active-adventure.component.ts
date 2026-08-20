import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslatePipe } from '@ngx-translate/core';

import { MapPreviewComponent } from '../../../../components/map-preview/map-preview.component';
import { MediaGalleryComponent } from '../../../../components/media-gallery/media-gallery.component';

@Component({
	selector: 'app-active-adventure-screen',
	standalone: true,
	imports: [
		CommonModule,
		UpperCasePipe,
		FormsModule,
		MatFormFieldModule,
		MatInputModule,
		MatIconModule,
		MatButtonModule,
		MatProgressBarModule,
		TranslatePipe,
		MapPreviewComponent,
		MediaGalleryComponent
	],
	templateUrl: './active-adventure.component.html',
	styleUrls: ['./active-adventure.component.scss']
})
export class ActiveAdventureScreenComponent {
	private readonly route = inject(ActivatedRoute);
	protected readonly adventureId = this.route.snapshot.paramMap.get('adventureId');

	protected readonly totalStations = 6;
	protected readonly currentStationIndex = 3;
	protected readonly stationTitle = 'The Mysterious Crest';
	protected readonly stationAddress = 'Táncsics Mihály utca 7, 1014 Budapest';

	protected answer = '';
	protected submitted = false;

	protected get progressPercent(): number {
		return (this.currentStationIndex / this.totalStations) * 100;
	}

	protected submitAnswer(): void {
		this.submitted = true;
	}
}
