import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { SbSize, SbTone } from '../atom.types';
import { SbIconComponent } from '../sb-icon/sb-icon.component';

@Component({
	selector: 'sb-badge',
	standalone: true,
	imports: [SbIconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: {
		class: 'sb-badge',
		'[attr.data-tone]': 'tone()',
		'[attr.data-size]': 'size()'
	},
	templateUrl: './sb-badge.component.html',
	styleUrl: './sb-badge.component.scss'
})
export class SbBadgeComponent {
	readonly label = input<string | null>(null);
	readonly icon = input<string | null>(null);
	readonly tone = input<SbTone>('neutral');
	readonly size = input<Exclude<SbSize, 'lg'>>('md');
}
