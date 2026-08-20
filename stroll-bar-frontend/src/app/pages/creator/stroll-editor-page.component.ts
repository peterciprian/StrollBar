import { Component } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';

interface EditableStation {
	id: string;
	title: string;
	address: string;
	latitude: number;
	longitude: number;
	story: string;
	taskType: 'Text Answer' | 'Multiple Choice' | 'Photo Proof';
	correctAnswer: string;
}

const TASK_TYPE_LABEL_KEYS: Record<EditableStation['taskType'], string> = {
	'Text Answer': 'SCREENS.ADMIN_STATION_EDITOR.TASK_TYPE_TEXT',
	'Multiple Choice': 'SCREENS.ADMIN_STATION_EDITOR.TASK_TYPE_CHOICE',
	'Photo Proof': 'SCREENS.ADMIN_STATION_EDITOR.TASK_TYPE_PHOTO'
};

@Component({
	selector: 'app-stroll-editor-page',
	standalone: true,
	imports: [
		CommonModule,
		UpperCasePipe,
		FormsModule,
		DragDropModule,
		MatButtonModule,
		MatIconModule,
		MatFormFieldModule,
		MatInputModule,
		MatSelectModule,
		TranslatePipe
	],
	templateUrl: './stroll-editor-page.component.html',
	styleUrls: ['./stroll-editor-page.component.scss']
})
export class StrollEditorPageComponent {
	protected readonly taskTypes: EditableStation['taskType'][] = ['Text Answer', 'Multiple Choice', 'Photo Proof'];
	protected readonly taskTypeLabelKeys = TASK_TYPE_LABEL_KEYS;

	protected stations: EditableStation[] = [
		{
			id: 'st1',
			title: "Fisherman's Bastion",
			address: 'Szentháromság tér 2, Budapest',
			latitude: 47.5022,
			longitude: 19.0347,
			story: 'A neo-Romanesque terrace built in 1902, named after the guild of fishermen who defended this stretch of the city walls in the Middle Ages.',
			taskType: 'Text Answer',
			correctAnswer: 'Seven towers'
		},
		{
			id: 'st2',
			title: 'Matthias Church',
			address: 'Szentháromság tér 2, Budapest',
			latitude: 47.5023,
			longitude: 19.0352,
			story: 'A 700-year-old church with a colourful Zsolnay-tiled roof, site of several royal coronations.',
			taskType: 'Multiple Choice',
			correctAnswer: 'Béla Tower'
		},
		{
			id: 'st3',
			title: 'The Mysterious Crest',
			address: 'Táncsics Mihály utca 7, Budapest',
			latitude: 47.5031,
			longitude: 19.0339,
			story: 'A weathered stone crest above a gate, believed to be a guild emblem from the 15th century.',
			taskType: 'Photo Proof',
			correctAnswer: 'Owl'
		},
		{
			id: 'st4',
			title: 'Buda Castle Courtyard',
			address: 'Szent György tér, Budapest',
			latitude: 47.4967,
			longitude: 19.0397,
			story: 'The historic royal palace complex, rebuilt many times since the 13th century.',
			taskType: 'Text Answer',
			correctAnswer: 'Turul bird'
		}
	];

	protected selectedStationId = this.stations[0].id;
	protected saved = false;

	protected get selectedStation(): EditableStation {
		return this.stations.find((station) => station.id === this.selectedStationId) ?? this.stations[0];
	}

	protected selectStation(id: string): void {
		this.selectedStationId = id;
		this.saved = false;
	}

	protected drop(event: CdkDragDrop<EditableStation[]>): void {
		moveItemInArray(this.stations, event.previousIndex, event.currentIndex);
	}

	protected addStation(): void {
		const id = `st-${this.stations.length + 1}-${Date.now()}`;
		const newStation: EditableStation = {
			id,
			title: `New Station ${this.stations.length + 1}`,
			address: '',
			latitude: 47.4979,
			longitude: 19.0402,
			story: '',
			taskType: 'Text Answer',
			correctAnswer: ''
		};
		this.stations = [...this.stations, newStation];
		this.selectedStationId = id;
	}

	protected saveChanges(): void {
		this.saved = true;
	}
}
