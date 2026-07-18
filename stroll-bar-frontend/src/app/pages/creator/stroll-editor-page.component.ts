import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StageManagerComponent } from '../../shared/components/stage-manager.component';

@Component({
  selector: 'app-stroll-editor-page',
  standalone: true,
  imports: [CommonModule, StageManagerComponent],
  templateUrl: './stroll-editor-page.component.html',
})
export class StrollEditorPageComponent {}
