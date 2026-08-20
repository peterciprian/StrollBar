import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
	selector: 'app-media-gallery',
	standalone: true,
	imports: [CommonModule, MatIconModule, TranslatePipe],
	templateUrl: './media-gallery.component.html',
	styleUrls: ['./media-gallery.component.scss']
})
export class MediaGalleryComponent {
	@Input() captions: string[] | null = null;
	@Input() variant: 'grid' | 'single' = 'grid';
}
