import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { StrollActiveStatus, StrollCategory, StrollPublicityFlag } from '../../core/api/models';
import { EditableStroll } from './creator-editor.models';
import { MediaChange, MediaManagerComponent } from './media-manager.component';

@Component({
	selector: 'app-stroll-details-editor',
	standalone: true,
	imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, TranslatePipe, MediaManagerComponent],
	templateUrl: './stroll-details-editor.component.html',
	styleUrls: ['./stroll-details-editor.component.scss']
})
export class StrollDetailsEditorComponent {
	@Input({ required: true }) stroll!: EditableStroll;
	@Input() strollId: string | null = null;
	@Input() activeStatuses: StrollActiveStatus[] = [];
	@Input() publicityFlags: StrollPublicityFlag[] = [];
	@Input() categories: StrollCategory[] = [];
	@Output() mediaChange = new EventEmitter<MediaChange>();
}
