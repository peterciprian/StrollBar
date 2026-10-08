import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { SbIconComponent } from '../sb-icon/sb-icon.component';

@Component({
	selector: 'sb-page-header',
	standalone: true,
	imports: [SbIconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'sb-page-header' },
	templateUrl: './sb-page-header.component.html',
	styleUrl: './sb-page-header.component.scss'
})
export class SbPageHeaderComponent {
	readonly title = input.required<string>();
	readonly subtitle = input<string | null>(null);
	readonly icon = input<string | null>(null);
	readonly headingLevel = input<1 | 2>(1);
}
