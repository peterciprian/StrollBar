import { Component, input } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { SbFormControlBase } from '../sb-form-control.base';
import { SbIconComponent } from '../sb-icon/sb-icon.component';

export interface SbSelectOption<T = unknown> {
	value: T;
	label: string;
	icon?: string;
	disabled?: boolean;
}

@Component({
	selector: 'sb-select',
	standalone: true,
	imports: [MatFormFieldModule, MatSelectModule, SbIconComponent],
	host: { class: 'sb-select' },
	templateUrl: './sb-select.component.html',
	styleUrl: './sb-select.component.scss'
})
export class SbSelectComponent<T> extends SbFormControlBase<T | T[]> {
	readonly options = input.required<readonly SbSelectOption<T>[]>();
	readonly multiple = input(false);
	readonly panelClass = input<string>('');

	protected onSelectionChange(value: T | T[]): void {
		this.commit(value);
	}
}
