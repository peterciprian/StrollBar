import { Component, input } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { SbFormControlBase } from '../sb-form-control.base';

@Component({
	selector: 'sb-textarea',
	standalone: true,
	imports: [MatFormFieldModule, MatInputModule],
	host: { class: 'sb-textarea' },
	templateUrl: './sb-textarea.component.html',
	styleUrl: './sb-textarea.component.scss'
})
export class SbTextareaComponent extends SbFormControlBase<string> {
	readonly rows = input(4);
	readonly maxlength = input<number | null>(null);
	readonly showCounter = input(false);

	protected get charCount(): number {
		return (this.value() ?? '').length;
	}

	protected onInput(event: Event): void {
		this.commit((event.target as HTMLTextAreaElement).value);
	}
}
