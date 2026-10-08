import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { SbPageHeaderComponent } from '../../components/atoms/sb-page-header/sb-page-header.component';

@Component({
	selector: 'app-creator-profile-page',
	standalone: true,
	imports: [TranslatePipe, SbPageHeaderComponent],
	templateUrl: './creator-profile-page.component.html'
})
export class CreatorProfilePageComponent {}
