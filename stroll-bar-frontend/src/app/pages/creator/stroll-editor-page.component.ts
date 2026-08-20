import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { StageManagerComponent } from '../../components/stage/stage-manager.component';

@Component({
	selector: 'app-stroll-editor-page',
	standalone: true,
	imports: [CommonModule, TranslatePipe, StageManagerComponent],
	templateUrl: './stroll-editor-page.component.html'
})
export class StrollEditorPageComponent {}
