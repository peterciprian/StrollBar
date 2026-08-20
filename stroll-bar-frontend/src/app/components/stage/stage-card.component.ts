import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
	selector: 'app-stage-card',
	standalone: true,
	imports: [CommonModule, MatIconModule],
	templateUrl: './stage-card.component.html',
	styleUrls: ['./stage-card.component.scss']
})
export class StageCardComponent {
	@Input() title = 'Stage title';
	@Input() description = 'Stage description';
	@Input() address = '';
	@Input() index: number | null = null;
	@Input() active = false;
	@Input() last = false;
}
