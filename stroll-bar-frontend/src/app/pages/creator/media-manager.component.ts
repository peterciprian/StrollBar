import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MediaUploadControlComponent } from './media-upload-control.component';

export type MediaKind = 'image' | 'video';
export interface MediaChange {
	imageUrls: string[];
	videoUrls: string[];
}

@Component({
	selector: 'app-media-manager',
	standalone: true,
	imports: [CommonModule, MatButtonModule, MatIconModule, MediaUploadControlComponent],
	templateUrl: './media-manager.component.html',
	styleUrls: ['./media-manager.component.scss']
})
export class MediaManagerComponent {
	@Input() imageUrls: string[] = [];
	@Input() videoUrls: string[] = [];
	@Input() entityId: string | null = null;
	@Input() purpose: 'stroll' | 'stage' = 'stage';
	@Input() lockedHintKey = 'SCREENS.ADMIN_STATION_EDITOR.UPLOAD_LOCKED_HINT';
	@Output() mediaChange = new EventEmitter<MediaChange>();

	protected change(kind: MediaKind, urls: string[]): void {
		this.mediaChange.emit({ imageUrls: kind === 'image' ? urls : [...this.imageUrls], videoUrls: kind === 'video' ? urls : [...this.videoUrls] });
	}

	protected remove(kind: MediaKind, index: number): void {
		const urls = kind === 'image' ? this.imageUrls : this.videoUrls;
		this.change(
			kind,
			urls.filter((_url, currentIndex) => currentIndex !== index)
		);
	}

	protected move(kind: MediaKind, index: number, direction: -1 | 1): void {
		const urls = kind === 'image' ? this.imageUrls : this.videoUrls;
		const targetIndex = index + direction;
		if (targetIndex < 0 || targetIndex >= urls.length) return;
		const reordered = [...urls];
		[reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
		this.change(kind, reordered);
	}
}
