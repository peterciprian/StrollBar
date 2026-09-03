import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, firstValueFrom, map, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { StrollCardComponent } from '../../components/stroll-card/stroll-card.component';
import { StrollCategory, StrollSummary } from '../../core/api/models';
import { StrollsFeatureService } from '../../features/strolls/strolls-feature.service';
import { AdventuresFeatureService } from '../../features/adventures/adventures-feature.service';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { MockPaymentDialogComponent } from './mock-payment-dialog.component';

type CategoryFilter = StrollCategory | 'ALL';

@Component({
	selector: 'app-stroll-browser-screen',
	standalone: true,
	imports: [
		CommonModule,
		UpperCasePipe,
		FormsModule,
		MatFormFieldModule,
		MatInputModule,
		MatIconModule,
		MatButtonModule,
		MatDialogModule,
		TranslatePipe,
		StrollCardComponent
	],
	templateUrl: './stroll-browser.component.html',
	styleUrls: ['./stroll-browser.component.scss']
})
export class StrollBrowserScreenComponent implements OnInit {
	private readonly strollsFeature = inject(StrollsFeatureService);
	private readonly adventuresFeature = inject(AdventuresFeatureService);
	private readonly tokenStorage = inject(TokenStorageService);
	private readonly dialog = inject(MatDialog);
	private readonly router = inject(Router);
	private readonly destroyRef = inject(DestroyRef);

	protected readonly categories: CategoryFilter[] = ['ALL', ...Object.values(StrollCategory)];
	protected strolls: StrollSummary[] = [];

	protected searchTerm = '';
	protected activeCategory: CategoryFilter = 'ALL';
	protected selectedStroll: StrollSummary | null = null;
	protected readonly startingAdventure = signal(false);
	protected readonly startAdventureError = signal(false);

	ngOnInit(): void {
		this.loadStrolls();
	}

	protected get filteredStrolls(): StrollSummary[] {
		return this.strolls.filter((stroll) => {
			const matchesCategory = this.activeCategory === 'ALL' || stroll.category === this.activeCategory;
			const matchesSearch = stroll.name.toLowerCase().includes(this.searchTerm.trim().toLowerCase());
			return matchesCategory && matchesSearch;
		});
	}

	protected selectCategory(category: CategoryFilter): void {
		this.activeCategory = category;
	}

	protected categoryLabelKey(category: CategoryFilter): string {
		return category === 'ALL' ? 'SCREENS.CATEGORY_ALL' : `SCREENS.CATEGORY_${category}`;
	}

	protected selectStrollCard(stroll: StrollSummary): void {
		this.selectedStroll = stroll;
		this.startAdventureError.set(false);
	}

	protected async startAdventure(): Promise<void> {
		if (this.startingAdventure() || !this.selectedStroll) {
			return;
		}

		if (!this.tokenStorage.getAccessToken()) {
			await this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/explore' } });
			return;
		}

		const confirmed = await firstValueFrom(
			this.dialog
				.open(MockPaymentDialogComponent, {
					data: { strollName: this.selectedStroll.name, price: this.selectedStroll.price?.amount ?? 0 },
					maxWidth: 'calc(100vw - 32px)',
					width: '420px'
				})
				.afterClosed()
		);

		if (!confirmed) {
			return;
		}

		this.startingAdventure.set(true);
		this.startAdventureError.set(false);

		try {
			const adventure = await firstValueFrom(this.adventuresFeature.unlock(this.selectedStroll.id));
			await firstValueFrom(this.adventuresFeature.start(adventure.id));
			await this.router.navigate(['/adventure', adventure.id]);
		} catch {
			this.startAdventureError.set(true);
		} finally {
			this.startingAdventure.set(false);
		}
	}

	private loadStrolls(): void {
		// Calls the real strolls list endpoint.
		this.strollsFeature
			.browse({ sortBy: 'most_used' })
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				map((response) => response?.items ?? []),
				catchError(() => of([] as StrollSummary[]))
			)
			.subscribe((strolls) => {
				this.strolls = strolls;
				this.selectedStroll = this.strolls[0] ?? null;
			});
	}
}
