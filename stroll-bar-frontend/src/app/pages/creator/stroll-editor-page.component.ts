import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StageManagerComponent } from '../../components/stage/stage-manager.component';

@Component({
  selector: 'app-stroll-editor-page',
  standalone: true,
  imports: [CommonModule, StageManagerComponent],
  templateUrl: './stroll-editor-page.component.html',
})
export class StrollEditorPageComponent {}
