import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { AdventuresFeatureService } from '../../features/adventures/adventures-feature.service';
import { AdventureResultResponse } from '../../core/api/models';

@Component({
	selector: 'app-adventure-result-page',
	standalone: true,
	imports: [CommonModule, MatButtonModule, MatIconModule, TranslatePipe],
	templateUrl: './adventure-result-page.component.html',
	styleUrls: ['./adventure-result-page.component.scss']
})
export class AdventureResultPageComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly adventuresFeature = inject(AdventuresFeatureService);
	protected loading = true;
	protected result: AdventureResultResponse | null = null;
	protected error = false;

	ngOnInit(): void {
		const adventureId = this.route.snapshot.paramMap.get('adventureId') ?? '';
		this.adventuresFeature.getResult(adventureId).subscribe({
			next: (result) => {
				this.result = result;
				this.loading = false;
			},
			error: () => {
				this.error = true;
				this.loading = false;
			}
		});
	}

	protected formatTime(seconds: number): string {
		const minutes = Math.floor(seconds / 60);
		return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
	}

	protected backToAdventures(): void {
		void this.router.navigate(['/user-dashboard']);
	}
}
