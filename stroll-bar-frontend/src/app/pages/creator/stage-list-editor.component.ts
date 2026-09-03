import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { EditableStage } from './creator-editor.models';

@Component({
	selector: 'app-stage-list-editor',
	standalone: true,
	imports: [CommonModule, DragDropModule, MatButtonModule, MatIconModule, TranslatePipe],
	templateUrl: './stage-list-editor.component.html',
	styleUrls: ['./stage-list-editor.component.scss']
})
export class StageListEditorComponent {
	@Input() stages: EditableStage[] = [];
	@Input() selectedStageId: string | null = null;
	@Input() saving = false;
	@Output() stagesChange = new EventEmitter<EditableStage[]>();
	@Output() stageSelected = new EventEmitter<string>();
	@Output() stageDeleted = new EventEmitter<EditableStage>();
	@Output() stageAdded = new EventEmitter<void>();
	@Output() saveRequested = new EventEmitter<void>();
	protected drop(event: CdkDragDrop<EditableStage[]>): void {
		const stages = [...this.stages];
		moveItemInArray(stages, event.previousIndex, event.currentIndex);
		this.stagesChange.emit(stages);
	}
}
