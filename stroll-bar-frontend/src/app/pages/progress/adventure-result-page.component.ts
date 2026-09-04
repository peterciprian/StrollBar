import { Component, ChangeDetectorRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AdventuresFeatureService } from '../../features/adventures/adventures-feature.service';
import { AdventureResultResponse } from '../../core/api/models';
import { formatDuration } from '../../core/utils/duration.util';

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
		return formatDuration(totalSeconds, (key, params) => this.translate.instant(key, params));
	}

	protected backToAdventures(): void {
		void this.router.navigate(['/user-dashboard']);
	}
}
