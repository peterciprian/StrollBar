import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
	selector: 'app-star-rating',
	standalone: true,
	imports: [CommonModule, MatIconModule],
	template: `
		<div class="star-rating" [class.star-rating--readonly]="readonly" role="img" [attr.aria-label]="ariaLabel">
			@for (star of stars; track star) {
				@if (readonly) {
					<mat-icon class="star-rating__star" [class.star-rating__star--filled]="star <= roundedValue">
						{{ star <= roundedValue ? 'star' : 'star_border' }}
					</mat-icon>
				} @else {
					<button
						type="button"
						class="star-rating__button"
						[attr.aria-label]="star"
						[attr.aria-pressed]="star === value"
						(click)="select(star)"
					>
						<mat-icon class="star-rating__star" [class.star-rating__star--filled]="star <= value">
							{{ star <= value ? 'star' : 'star_border' }}
						</mat-icon>
					</button>
				}
			}
		</div>
	`,
	styles: [
		`
			.star-rating {
				align-items: center;
				display: inline-flex;
				gap: 2px;
			}
			.star-rating__button {
				appearance: none;
				background: none;
				border: 0;
				cursor: pointer;
				display: inline-flex;
				padding: 2px;
			}
			.star-rating__star {
				color: #cbd5e1;
				font-size: 20px;
				height: 20px;
				width: 20px;
			}
			.star-rating__star--filled {
				color: #f59e0b;
			}
			.star-rating--readonly .star-rating__star {
				font-size: 16px;
				height: 16px;
				width: 16px;
			}
		`
	]
})
export class StarRatingComponent {
	@Input() value = 0;
	@Input() readonly = false;
	@Output() valueChange = new EventEmitter<number>();

	protected readonly stars = [1, 2, 3, 4, 5];

	protected get roundedValue(): number {
		return Math.round(this.value);
	}

	protected get ariaLabel(): string {
		return `${this.value} / 5`;
	}

	protected select(star: number): void {
		if (this.readonly) return;
		this.value = star;
		this.valueChange.emit(star);
	}
}
