import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { SbSize } from '../atom.types';
import { SbIconComponent } from '../sb-icon/sb-icon.component';

@Component({
	selector: 'sb-avatar',
	standalone: true,
	imports: [SbIconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'sb-avatar', '[attr.data-size]': 'size()' },
	templateUrl: './sb-avatar.component.html',
	styleUrl: './sb-avatar.component.scss'
})
export class SbAvatarComponent {
	readonly src = input<string | null>(null);
	readonly name = input<string | null>(null);
	readonly size = input<SbSize>('md');

	protected readonly imageFailed = signal(false);

	protected readonly showImage = computed(() => !!this.src() && !this.imageFailed());

	protected readonly initials = computed(() => {
		const parts = (this.name() ?? '').trim().split(/\s+/).filter(Boolean);
		if (parts.length === 0) return '';
		return parts
			.slice(0, 2)
			.map((part) => part[0]!.toUpperCase())
			.join('');
	});

	protected onImageError(): void {
		this.imageFailed.set(true);
	}
}
