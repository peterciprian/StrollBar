import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stage-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stage-card.component.html',
})
export class StageCardComponent {
  @Input() title = 'Stage title';
  @Input() description = 'Stage description';
}
