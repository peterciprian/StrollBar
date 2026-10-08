import { Component } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { SbFormControlBase } from '../sb-form-control.base';

@Component({
	selector: 'sb-checkbox',
	standalone: true,
	imports: [MatCheckboxModule],
	host: { class: 'sb-checkbox' },
	templateUrl: './sb-checkbox.component.html',
	styleUrl: './sb-checkbox.component.scss'
})
export class SbCheckboxComponent extends SbFormControlBase<boolean> {
	protected onToggle(checked: boolean): void {
		this.commit(checked);
		this.markTouched();
	}
}
