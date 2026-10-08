import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { SbIconComponent } from '../sb-icon/sb-icon.component';

@Component({
	selector: 'sb-empty-state',
	standalone: true,
	imports: [SbIconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'sb-empty-state' },
	templateUrl: './sb-empty-state.component.html',
	styleUrl: './sb-empty-state.component.scss'
})
export class SbEmptyStateComponent {
	readonly title = input.required<string>();
	readonly description = input<string | null>(null);
	readonly icon = input<string>('inbox');
}
