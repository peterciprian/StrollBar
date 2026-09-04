import { Component, ChangeDetectorRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
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
	private readonly cdr = inject(ChangeDetectorRef);
	private readonly translate = inject(TranslateService);
	protected loading = true;
	protected result: AdventureResultResponse | null = null;
	protected error = false;

	ngOnInit(): void {
		const adventureId = this.route.snapshot.paramMap.get('adventureId') ?? '';
		this.adventuresFeature.getResult(adventureId).subscribe({
			next: (result) => {
				this.result = result;
				this.loading = false;
				this.cdr.detectChanges();
			},
			error: () => {
				this.error = true;
				this.loading = false;
				this.cdr.detectChanges();
			}
		});
	}

	protected formatTime(totalSeconds: number): string {
		const days = Math.floor(totalSeconds / 86400);
		const hours = Math.floor((totalSeconds % 86400) / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;
		const pad = (value: number) => String(value).padStart(2, '0');

		if (days > 0) {
			return this.translate.instant('SCREENS.ADVENTURE_RESULT.DURATION_DHMS', { d: days, h: hours, m: minutes, s: pad(seconds) });
		}
		if (hours > 0) {
			return this.translate.instant('SCREENS.ADVENTURE_RESULT.DURATION_HMS', { h: hours, m: minutes, s: pad(seconds) });
		}
		return this.translate.instant('SCREENS.ADVENTURE_RESULT.DURATION_MS', { m: minutes, s: pad(seconds) });
	}

	protected backToAdventures(): void {
		void this.router.navigate(['/user-dashboard']);
	}
}
