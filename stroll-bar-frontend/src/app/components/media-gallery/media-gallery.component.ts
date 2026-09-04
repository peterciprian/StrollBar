import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

interface MediaItem {
	type: 'image' | 'video';
	url: string;
}

@Component({
	selector: 'app-media-gallery',
	standalone: true,
	imports: [CommonModule, MatIconModule, TranslatePipe],
	templateUrl: './media-gallery.component.html',
	styleUrls: ['./media-gallery.component.scss']
})
export class MediaGalleryComponent {
	@Input() set images(value: string[] | null | undefined) {
		this._images = value ?? [];
		this.rebuildItems();
	}
	@Input() set videos(value: string[] | null | undefined) {
		this._videos = value ?? [];
		this.rebuildItems();
	}
	@Input() variant: 'grid' | 'single' = 'grid';

	private _images: string[] = [];
	private _videos: string[] = [];

	protected items: MediaItem[] = [];
	protected activeIndex = 0;
	protected lightboxOpen = false;

	protected get activeItem(): MediaItem | null {
		return this.items[this.activeIndex] ?? null;
	}

	protected select(index: number): void {
		this.activeIndex = index;
	}

	protected openLightbox(index: number): void {
		this.activeIndex = index;
		this.lightboxOpen = true;
	}

	protected closeLightbox(): void {
		this.lightboxOpen = false;
	}

	protected showPrevious(event: Event): void {
		event.stopPropagation();
		this.activeIndex = (this.activeIndex - 1 + this.items.length) % this.items.length;
	}

	protected showNext(event: Event): void {
		event.stopPropagation();
		this.activeIndex = (this.activeIndex + 1) % this.items.length;
	}

	private rebuildItems(): void {
		this.items = [
			...this._images.map((url) => ({ type: 'image' as const, url })),
			...this._videos.map((url) => ({ type: 'video' as const, url }))
		];
		this.activeIndex = 0;
	}
}
