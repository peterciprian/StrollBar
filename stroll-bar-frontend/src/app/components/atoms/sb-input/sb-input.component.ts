import { Component, input } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { SbFormControlBase } from '../sb-form-control.base';
import { SbIconComponent } from '../sb-icon/sb-icon.component';

@Component({
	selector: 'sb-input',
	standalone: true,
	imports: [MatFormFieldModule, MatInputModule, SbIconComponent],
	host: { class: 'sb-input' },
	templateUrl: './sb-input.component.html',
	styleUrl: './sb-input.component.scss'
})
export class SbInputComponent extends SbFormControlBase<string | number> {
	readonly type = input<'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'>('text');
	readonly prefixIcon = input<string | null>(null);
	readonly suffixIcon = input<string | null>(null);
	readonly maxlength = input<number | null>(null);
	readonly autocomplete = input<string | null>(null);

	protected onInput(event: Event): void {
		const inputElement = event.target as HTMLInputElement;
		if (this.type() === 'number') {
			this.commit(inputElement.value === '' ? null : inputElement.valueAsNumber);
			return;
		}
		this.commit(inputElement.value);
	}
}
