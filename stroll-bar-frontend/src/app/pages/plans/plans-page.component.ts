import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { SbButtonComponent } from '../../components/atoms/sb-button/sb-button.component';
import { SbPageHeaderComponent } from '../../components/atoms/sb-page-header/sb-page-header.component';

@Component({
	selector: 'app-plans-page',
	standalone: true,
	imports: [TranslatePipe, SbButtonComponent, SbPageHeaderComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './plans-page.component.html',
	styleUrl: './plans-page.component.scss'
})
export class PlansPageComponent {}
