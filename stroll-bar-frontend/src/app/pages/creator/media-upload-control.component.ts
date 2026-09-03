import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { MediaUploadFeatureService } from '../../features/media/media-upload-feature.service';

@Component({
	selector: 'app-media-upload-control',
	standalone: true,
	imports: [MatIconModule, TranslatePipe],
	templateUrl: './media-upload-control.component.html',
	styleUrls: ['./media-upload-control.component.scss']
})
export class MediaUploadControlComponent {
	private readonly mediaUpload = inject(MediaUploadFeatureService);
	@Input() accept = 'image/*';
	@Input() purpose: 'stroll' | 'stage' = 'stage';
	@Input() entityId: string | null = null;
	@Input() locked = false;
	@Input() hintKey = 'SCREENS.ADMIN_STATION_EDITOR.UPLOAD_HINT';
	@Input() lockedHintKey = 'SCREENS.ADMIN_STATION_EDITOR.UPLOAD_LOCKED_HINT';
	@Input() icon = 'cloud_upload';
	@Output() uploaded = new EventEmitter<string>();
	@Output() uploadState = new EventEmitter<boolean>();
	@Output() failed = new EventEmitter<void>();

	protected uploading = false;

	protected selectFile(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0] ?? null;
		input.value = '';
		if (!file || this.locked || !this.entityId) return;
		this.uploading = true;
		this.uploadState.emit(true);
		this.mediaUpload.upload(file, this.purpose, this.entityId).subscribe({
			next: (publicUrl) => {
				this.uploading = false;
				this.uploadState.emit(false);
				this.uploaded.emit(publicUrl);
			},
			error: () => {
				this.uploading = false;
				this.uploadState.emit(false);
				this.failed.emit();
			}
		});
	}
}
