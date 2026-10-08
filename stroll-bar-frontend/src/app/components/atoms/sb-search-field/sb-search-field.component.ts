import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { SbIconButtonComponent } from '../sb-icon-button/sb-icon-button.component';
import { SbIconComponent } from '../sb-icon/sb-icon.component';

@Component({
	selector: 'sb-search-field',
	standalone: true,
	imports: [MatFormFieldModule, MatInputModule, SbIconComponent, SbIconButtonComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'sb-search-field' },
	templateUrl: './sb-search-field.component.html',
	styleUrl: './sb-search-field.component.scss'
})
export class SbSearchFieldComponent {
	readonly label = input<string | null>(null);
	readonly placeholder = input<string>('');
	readonly debounce = input(300);
	readonly value = input<string>('');
	readonly clearLabel = input<string>('Clear');

	readonly searched = output<string>();

	private readonly term = signal('');
	protected readonly current = computed(() => this.term());

	constructor() {
		const destroyRef = inject(DestroyRef);
		let destroyed = false;
		destroyRef.onDestroy(() => (destroyed = true));
		effect(() => this.term.set(this.value()));
		toObservable(this.term)
			.pipe(debounceTime(this.debounce()), distinctUntilChanged(), takeUntilDestroyed(destroyRef))
			.subscribe((term) => {
				if (!destroyed) this.searched.emit(term);
			});
	}

	protected onInput(event: Event): void {
		this.term.set((event.target as HTMLInputElement).value);
	}

	protected clear(): void {
		this.term.set('');
	}
}
