import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-map-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-preview.component.html',
})
export class MapPreviewComponent {
  @Input() latitude: number | null = null;
  @Input() longitude: number | null = null;
}
