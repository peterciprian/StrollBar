import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { EditableStage } from './creator-editor.models';
import { MediaChange, MediaManagerComponent } from './media-manager.component';
import { StageLocationMapComponent } from './stage-location-map.component';
import { SbInputComponent } from '../../components/atoms/sb-input/sb-input.component';
import { SbTextareaComponent } from '../../components/atoms/sb-textarea/sb-textarea.component';

@Component({
	selector: 'app-stage-detail-editor',
	standalone: true,
	imports: [CommonModule, FormsModule, TranslatePipe, MediaManagerComponent, StageLocationMapComponent, SbInputComponent, SbTextareaComponent],
	templateUrl: './stage-detail-editor.component.html',
	styleUrls: ['./stage-detail-editor.component.scss']
})
export class StageDetailEditorComponent {
	@Input() stage: EditableStage | null = null;
	@Input() strollId: string | null = null;
	@Output() mediaChange = new EventEmitter<MediaChange>();
	@Output() locationChange = new EventEmitter<{ latitude: number; longitude: number }>();
}
