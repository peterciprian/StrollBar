import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { SbIconSize, SbTone } from '../atom.types';

@Component({
	selector: 'sb-icon',
	standalone: true,
	imports: [MatIconModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'sb-icon' },
	templateUrl: './sb-icon.component.html',
	styleUrl: './sb-icon.component.scss'
})
export class SbIconComponent {
	readonly name = input.required<string>();
	readonly svgIcon = input<string | null>(null);
	readonly size = input<SbIconSize>('md');
	readonly tone = input<SbTone | 'inherit'>('inherit');
	/** Decorative by default; set a label to expose the icon to screen readers. */
	readonly ariaLabel = input<string | null>(null);

	protected readonly glyphClasses = computed(() => `sb-icon--${this.size()} sb-icon--${this.tone()}`);
}
