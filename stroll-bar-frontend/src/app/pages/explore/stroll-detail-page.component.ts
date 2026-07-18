import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StageCardComponent } from '../../shared/components/stage-card.component';
import { MediaGalleryComponent } from '../../shared/components/media-gallery.component';
import { MapPreviewComponent } from '../../shared/components/map-preview.component';

@Component({
  selector: 'app-stroll-detail-page',
  standalone: true,
  imports: [CommonModule, StageCardComponent, MediaGalleryComponent, MapPreviewComponent],
  templateUrl: './stroll-detail-page.component.html',
})
export class StrollDetailPageComponent {}
