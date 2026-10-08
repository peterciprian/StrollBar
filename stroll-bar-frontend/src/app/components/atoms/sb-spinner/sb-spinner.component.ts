import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { SbSize } from '../atom.types';

@Component({
	selector: 'sb-spinner',
	standalone: true,
	imports: [MatProgressSpinnerModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: {
		class: 'sb-spinner',
		'[class.sb-spinner--block]': 'block()',
		role: 'status'
	},
	templateUrl: './sb-spinner.component.html',
	styleUrl: './sb-spinner.component.scss'
})
export class SbSpinnerComponent {
	readonly size = input<SbSize>('md');
	/** Centres the spinner in its own row instead of flowing inline. */
	readonly block = input(false);
	readonly label = input<string | null>(null);

	protected readonly diameter = computed(() => ({ sm: 16, md: 24, lg: 40 })[this.size()]);
}
