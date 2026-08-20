import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
	selector: 'app-creator-profile-page',
	standalone: true,
	imports: [CommonModule, TranslatePipe],
	templateUrl: './creator-profile-page.component.html'
})
export class CreatorProfilePageComponent {}
