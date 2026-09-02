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
import { CATEGORY_LABEL_KEYS, MOCK_STROLLS, Stroll, StrollCategory } from '../../core/models/screens.models';
import { StrollsFeatureService } from '../../features/strolls/strolls-feature.service';
import { mapStrollToStroll } from '../../features/strolls/stroll-mappers';
import { AdventuresFeatureService } from '../../features/adventures/adventures-feature.service';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { MockPaymentDialogComponent } from './mock-payment-dialog.component';

type CategoryFilter = StrollCategory | 'All';

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

	protected readonly categories: CategoryFilter[] = ['All', 'Historical', 'Mystery', 'Cultural'];
	protected readonly categoryLabelKeys = CATEGORY_LABEL_KEYS;
	protected strolls: Stroll[] = MOCK_STROLLS;

	protected searchTerm = '';
	protected activeCategory: CategoryFilter = 'All';
	protected selectedStroll: Stroll = this.strolls[0];
	protected readonly startingAdventure = signal(false);
	protected readonly startAdventureError = signal(false);

	ngOnInit(): void {
		this.loadStrolls();
	}

	protected get filteredStrolls(): Stroll[] {
		return this.strolls.filter((stroll) => {
			const matchesCategory = this.activeCategory === 'All' || stroll.category === this.activeCategory;
			const matchesSearch = stroll.title.toLowerCase().includes(this.searchTerm.trim().toLowerCase());
			return matchesCategory && matchesSearch;
		});
	}

	protected selectCategory(category: CategoryFilter): void {
		this.activeCategory = category;
	}

	protected selectStrollCard(stroll: Stroll): void {
		this.selectedStroll = stroll;
		this.startAdventureError.set(false);
	}

	protected async startAdventure(): Promise<void> {
		if (this.startingAdventure()) {
			return;
		}

		if (!this.tokenStorage.getAccessToken()) {
			await this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/explore' } });
			return;
		}

		const confirmed = await firstValueFrom(
			this.dialog
				.open(MockPaymentDialogComponent, {
					data: { strollName: this.selectedStroll.title, price: this.selectedStroll.price },
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
		// Calls the real strolls list endpoint; falls back to demo strolls on error, empty, or missing response.
		this.strollsFeature
			.browse({ sortBy: 'most_used' })
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				map((response) => (response?.items?.length ? response.items.map((stroll) => mapStrollToStroll(stroll)) : MOCK_STROLLS)),
				catchError(() => of(MOCK_STROLLS))
			)
			.subscribe((strolls) => {
				this.strolls = strolls;
				this.selectStrollCard(this.strolls[0]);
			});
	}
}
