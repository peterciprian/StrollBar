import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { SbIconComponent } from '../sb-icon/sb-icon.component';

@Component({
	selector: 'sb-star-rating',
	standalone: true,
	imports: [SbIconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'sb-star-rating', '[class.sb-star-rating--readonly]': 'readonly()' },
	templateUrl: './sb-star-rating.component.html',
	styleUrl: './sb-star-rating.component.scss'
})
export class SbStarRatingComponent {
	readonly value = input(0);
	readonly readonly = input(false);

	readonly valueChange = output<number>();

	protected readonly stars = [1, 2, 3, 4, 5];
	protected readonly rounded = computed(() => Math.round(this.value()));
	protected readonly ariaLabel = computed(() => `${this.value()} / 5`);

	protected select(star: number): void {
		if (this.readonly()) return;
		this.valueChange.emit(star);
	}
}
