import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { SbTone } from '../atom.types';

@Component({
	selector: 'sb-progress-bar',
	standalone: true,
	imports: [MatProgressBarModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'sb-progress-bar', '[attr.data-tone]': 'tone()' },
	templateUrl: './sb-progress-bar.component.html',
	styleUrl: './sb-progress-bar.component.scss'
})
export class SbProgressBarComponent {
	readonly value = input(0);
	readonly mode = input<'determinate' | 'indeterminate' | 'buffer' | 'query'>('determinate');
	readonly tone = input<SbTone>('primary');
	readonly label = input<string | null>(null);
	readonly valueText = input<string | null>(null);
}
