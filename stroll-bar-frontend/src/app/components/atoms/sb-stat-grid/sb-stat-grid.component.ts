import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { SbTone } from '../atom.types';
import { SbIconComponent } from '../sb-icon/sb-icon.component';

export interface SbStat {
	label: string;
	value: string | number;
	icon?: string;
	tone?: SbTone;
}

@Component({
	selector: 'sb-stat-grid',
	standalone: true,
	imports: [SbIconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'sb-stat-grid' },
	templateUrl: './sb-stat-grid.component.html',
	styleUrl: './sb-stat-grid.component.scss'
})
export class SbStatGridComponent {
	readonly stats = input.required<readonly SbStat[]>();
}
