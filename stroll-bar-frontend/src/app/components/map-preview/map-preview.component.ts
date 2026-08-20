import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

export interface MapMarker {
	name: string;
}

@Component({
	selector: 'app-map-preview',
	standalone: true,
	imports: [CommonModule, MatIconModule, TranslatePipe],
	templateUrl: './map-preview.component.html',
	styleUrls: ['./map-preview.component.scss']
})
export class MapPreviewComponent {
	@Input() latitude: number | null = null;
	@Input() longitude: number | null = null;
	@Input() targetLabel = '';
	@Input() variant: 'compact' | 'full' = 'compact';
}
