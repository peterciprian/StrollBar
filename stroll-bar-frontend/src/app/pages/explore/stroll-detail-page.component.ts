import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { StageCardComponent } from '../../components/stage/stage-card.component';
import { MediaGalleryComponent } from '../../components/media-gallery/media-gallery.component';
import { MapPreviewComponent } from '../../components/map-preview/map-preview.component';

@Component({
	selector: 'app-stroll-detail-page',
	standalone: true,
	imports: [CommonModule, TranslatePipe, StageCardComponent, MediaGalleryComponent, MapPreviewComponent],
	templateUrl: './stroll-detail-page.component.html'
})
export class StrollDetailPageComponent {}
