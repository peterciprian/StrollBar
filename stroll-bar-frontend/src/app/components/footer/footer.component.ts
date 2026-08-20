import { Component, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
	selector: 'app-footer',
	standalone: true,
	imports: [MatToolbarModule, MatButtonModule, MatIconModule, TranslatePipe],
	templateUrl: './footer.component.html',
	styleUrl: './footer.component.scss'
})
export class FooterComponent {
	protected readonly year = new Date().getFullYear();

	constructor() {
		inject(MatIconRegistry).addSvgIcon('github', inject(DomSanitizer).bypassSecurityTrustResourceUrl('assets/icons/github.svg'));
	}
}
