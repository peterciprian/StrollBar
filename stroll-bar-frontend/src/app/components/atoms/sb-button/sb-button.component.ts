import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenu, MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';

import { SbButtonVariant, SbSize } from '../atom.types';
import { SbIconComponent } from '../sb-icon/sb-icon.component';

@Component({
	selector: 'sb-button',
	standalone: true,
	imports: [NgTemplateOutlet, MatButtonModule, MatMenuModule, MatProgressSpinnerModule, MatTooltipModule, RouterLink, SbIconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: {
		class: 'sb-button',
		'[class.sb-button--full-width]': 'fullWidth()',
		'[class.sb-button--active]': 'active()',
		'[attr.aria-current]': 'active() ? "page" : null',
		'[attr.data-variant]': 'variant()',
		'[attr.data-size]': 'size()'
	},
	templateUrl: './sb-button.component.html',
	styleUrl: './sb-button.component.scss'
})
export class SbButtonComponent {
	readonly label = input<string | null>(null);
	readonly variant = input<SbButtonVariant>('primary');
	readonly size = input<SbSize>('md');
	readonly type = input<'button' | 'submit' | 'reset'>('button');
	readonly icon = input<string | null>(null);
	readonly svgIcon = input<string | null>(null);
	readonly trailingIcon = input<string | null>(null);
	readonly disabled = input(false);
	readonly loading = input(false);
	readonly fullWidth = input(false);
	readonly active = input(false);
	readonly tooltip = input<string | null>(null);
	readonly ariaLabel = input<string | null>(null);
	/** Renders an anchor instead of a button when set. */
	readonly routerLink = input<unknown[] | string | null>(null);
	readonly href = input<string | null>(null);
	readonly target = input<string | null>(null);
	readonly menuTriggerFor = input<MatMenu | null>(null);

	readonly clicked = output<MouseEvent>();

	protected readonly isDisabled = computed(() => this.disabled() || this.loading());
	protected readonly iconSize = computed(() => (this.size() === 'lg' ? 'lg' : this.size() === 'sm' ? 'sm' : 'md'));

	protected onClick(event: MouseEvent): void {
		if (this.isDisabled()) {
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		this.clicked.emit(event);
	}
}
