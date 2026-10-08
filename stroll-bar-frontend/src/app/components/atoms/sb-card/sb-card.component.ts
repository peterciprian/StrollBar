import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { SbSize } from '../atom.types';

@Component({
	selector: 'sb-card',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: {
		class: 'sb-card',
		'[attr.data-padding]': 'padding()',
		'[class.sb-card--clickable]': 'clickable()',
		'[class.sb-card--selected]': 'selected()',
		'[class.sb-card--flat]': 'flat()',
		'[attr.role]': 'clickable() ? "button" : null',
		'[attr.tabindex]': 'clickable() ? 0 : null',
		'(click)': 'onActivate($event)',
		'(keydown.enter)': 'onActivate($event)',
		'(keydown.space)': 'onActivate($event)'
	},
	templateUrl: './sb-card.component.html',
	styleUrl: './sb-card.component.scss'
})
export class SbCardComponent {
	readonly padding = input<SbSize | 'none'>('md');
	readonly clickable = input(false);
	readonly selected = input(false);
	readonly flat = input(false);

	readonly activated = output<Event>();

	protected onActivate(event: Event): void {
		if (!this.clickable()) return;
		event.preventDefault();
		this.activated.emit(event);
	}
}
