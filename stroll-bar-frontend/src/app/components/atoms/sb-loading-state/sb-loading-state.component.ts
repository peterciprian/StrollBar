import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { SbLoadState } from '../atom.types';
import { SbButtonComponent } from '../sb-button/sb-button.component';
import { SbEmptyStateComponent } from '../sb-empty-state/sb-empty-state.component';
import { SbSpinnerComponent } from '../sb-spinner/sb-spinner.component';

/**
 * Replaces the hand-rolled `loading / error / empty` branches that were duplicated across screens.
 * Renders projected content only in the `idle` state.
 */
@Component({
	selector: 'sb-loading-state',
	standalone: true,
	imports: [SbButtonComponent, SbEmptyStateComponent, SbSpinnerComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'sb-loading-state' },
	templateUrl: './sb-loading-state.component.html',
	styleUrl: './sb-loading-state.component.scss'
})
export class SbLoadingStateComponent {
	readonly state = input.required<SbLoadState>();
	readonly loadingText = input<string | null>(null);
	readonly errorTitle = input<string>('');
	readonly errorDescription = input<string | null>(null);
	readonly emptyTitle = input<string>('');
	readonly emptyDescription = input<string | null>(null);
	readonly retryLabel = input<string | null>(null);

	readonly retried = output<void>();
}
