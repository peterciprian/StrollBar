import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';

import { SbTone } from '../atom.types';
import { SbIconComponent } from '../sb-icon/sb-icon.component';

@Component({
	selector: 'sb-dialog-shell',
	standalone: true,
	imports: [MatDialogModule, SbIconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'sb-dialog-shell', '[attr.data-tone]': 'tone()' },
	templateUrl: './sb-dialog-shell.component.html',
	styleUrl: './sb-dialog-shell.component.scss'
})
export class SbDialogShellComponent {
	readonly title = input.required<string>();
	readonly icon = input<string | null>(null);
	readonly tone = input<SbTone>('neutral');
}
