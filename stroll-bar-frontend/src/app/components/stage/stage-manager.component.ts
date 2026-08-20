import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
	selector: 'app-stage-manager',
	standalone: true,
	templateUrl: './stage-manager.component.html',
	imports: [CommonModule, TranslatePipe]
})
export class StageManagerComponent {}
