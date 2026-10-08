import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenu, MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

import { SbSize, SbTone } from '../atom.types';
import { SbIconComponent } from '../sb-icon/sb-icon.component';

@Component({
	selector: 'sb-icon-button',
	standalone: true,
	imports: [MatButtonModule, MatMenuModule, MatTooltipModule, SbIconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: {
		class: 'sb-icon-button',
		'[attr.data-size]': 'size()',
		'[attr.data-tone]': 'tone()'
	},
	templateUrl: './sb-icon-button.component.html',
	styleUrl: './sb-icon-button.component.scss'
})
export class SbIconButtonComponent {
	readonly icon = input.required<string>();
	/** Required: an icon-only control must always carry an accessible name. */
	readonly ariaLabel = input.required<string>();
	readonly tone = input<SbTone>('neutral');
	readonly size = input<SbSize>('md');
	readonly type = input<'button' | 'submit' | 'reset'>('button');
	readonly disabled = input(false);
	readonly tooltip = input<string | null>(null);
	readonly menuTriggerFor = input<MatMenu | null>(null);

	readonly clicked = output<MouseEvent>();

	protected readonly iconSize = computed<SbSize>(() => (this.size() === 'lg' ? 'lg' : this.size() === 'sm' ? 'sm' : 'md'));

	protected onClick(event: MouseEvent): void {
		if (this.disabled()) {
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		this.clicked.emit(event);
	}
}
