import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { SbTone } from '../atom.types';
import { SbIconButtonComponent } from '../sb-icon-button/sb-icon-button.component';
import { SbIconComponent } from '../sb-icon/sb-icon.component';

const TONE_ICONS: Record<SbTone, string> = {
	neutral: 'info',
	primary: 'info',
	success: 'check_circle',
	warning: 'warning',
	danger: 'error',
	info: 'info'
};

@Component({
	selector: 'sb-alert',
	standalone: true,
	imports: [SbIconComponent, SbIconButtonComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'sb-alert', '[attr.data-tone]': 'tone()', role: 'status' },
	templateUrl: './sb-alert.component.html',
	styleUrl: './sb-alert.component.scss'
})
export class SbAlertComponent {
	readonly tone = input<SbTone>('info');
	readonly title = input<string | null>(null);
	readonly message = input<string | null>(null);
	readonly icon = input<string | null>(null);
	readonly dismissLabel = input<string | null>(null);

	readonly dismissed = output<void>();

	protected readonly resolvedIcon = computed(() => this.icon() ?? TONE_ICONS[this.tone()]);
}
