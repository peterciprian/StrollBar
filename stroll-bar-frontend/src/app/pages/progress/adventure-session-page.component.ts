import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
	selector: 'app-adventure-session-page',
	standalone: true,
	imports: [CommonModule, TranslatePipe],
	templateUrl: './adventure-session-page.component.html'
})
export class AdventureSessionPageComponent {}
