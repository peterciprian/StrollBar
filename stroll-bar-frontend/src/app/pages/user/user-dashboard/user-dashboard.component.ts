import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AdventureDetailResponse } from '../../../core/api/models';
import { AdventuresFeatureService } from '../../../features/adventures/adventures-feature.service';

@Component({
	selector: 'app-user-dashboard-screen',
	standalone: true,
	imports: [CommonModule, MatButtonModule, MatIconModule, MatTableModule, MatTooltipModule, TranslatePipe],
	templateUrl: './user-dashboard.component.html',
	styleUrls: ['./user-dashboard.component.scss']
})
export class UserDashboardScreenComponent implements OnInit {
	private readonly router = inject(Router);
	private readonly adventuresFeature = inject(AdventuresFeatureService);
	private readonly destroyRef = inject(DestroyRef);

	protected readonly displayedColumns = ['name', 'status', 'progress', 'currentStage', 'purchased', 'activity', 'actions'];
	protected readonly adventures = signal<AdventureDetailResponse[]>([]);
	protected readonly loading = signal(true);
	protected readonly loadError = signal(false);
	protected readonly activeCount = computed(() => this.adventures().filter(({ adventure }) => adventure.progressStatus === 'in_progress').length);
	protected readonly completedCount = computed(() => this.adventures().filter(({ adventure }) => adventure.progressStatus === 'completed').length);
	protected readonly totalStages = computed(() => this.adventures().reduce((total, { stroll }) => total + (stroll?.stageCount ?? 0), 0));
	protected readonly replayingAdventureId = signal<string | null>(null);

	ngOnInit(): void {
		this.adventuresFeature
			.list()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (adventures) => {
					this.adventures.set(adventures);
					this.loading.set(false);
				},
				error: () => {
					this.loadError.set(true);
					this.loading.set(false);
				}
			});
	}

	protected progressPercent(detail: AdventureDetailResponse): number {
		const stageCount = detail.stroll?.stageCount ?? 0;

		if (!stageCount) {
			return 0;
		}

		if (detail.adventure.progressStatus === 'completed') {
			return 100;
		}

		return Math.round(((detail.adventure.currentStageIndex - 1) / stageCount) * 100);
	}

	protected openAdventure(detail: AdventureDetailResponse): void {
		if (detail.adventure.progressStatus === 'completed') {
			this.viewResult(detail);
			return;
		}

		if (detail.adventure.progressStatus === 'purchased') {
			this.adventuresFeature
				.start(detail.adventure.id)
				.pipe(takeUntilDestroyed(this.destroyRef))
				.subscribe({
					next: () => this.router.navigate(['/adventure', detail.adventure.id]),
					error: () => this.loadError.set(true)
				});
			return;
		}

		this.router.navigate(['/adventure', detail.adventure.id]);
	}

	protected viewResult(detail: AdventureDetailResponse): void {
		this.router.navigate(['/adventure', detail.adventure.id, 'result']);
	}

	protected viewAchievements(): void {
		this.router.navigate(['/settings/achievements']);
	}

	protected replayAdventure(detail: AdventureDetailResponse): void {
		if (!detail.stroll || this.replayingAdventureId()) {
			return;
		}

		this.replayingAdventureId.set(detail.adventure.id);
		this.adventuresFeature
			.unlock(detail.stroll.id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (newAdventure) => {
					this.adventuresFeature
						.start(newAdventure.id)
						.pipe(takeUntilDestroyed(this.destroyRef))
						.subscribe({
							next: () => {
								this.replayingAdventureId.set(null);
								this.router.navigate(['/adventure', newAdventure.id]);
							},
							error: () => {
								this.replayingAdventureId.set(null);
								this.loadError.set(true);
							}
						});
				},
				error: () => {
					this.replayingAdventureId.set(null);
					this.loadError.set(true);
				}
			});
	}
}
