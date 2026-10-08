import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SbTone } from '../../../components/atoms/atom.types';
import { SbBadgeComponent } from '../../../components/atoms/sb-badge/sb-badge.component';
import { SbIconButtonComponent } from '../../../components/atoms/sb-icon-button/sb-icon-button.component';
import { SbPageHeaderComponent } from '../../../components/atoms/sb-page-header/sb-page-header.component';
import { SbProgressBarComponent } from '../../../components/atoms/sb-progress-bar/sb-progress-bar.component';
import { SbStatGridComponent } from '../../../components/atoms/sb-stat-grid/sb-stat-grid.component';
import { SbCellDirective } from '../../../components/atoms/sb-table/sb-cell.directive';
import { SbTableComponent } from '../../../components/atoms/sb-table/sb-table.component';
import { SbTableColumn } from '../../../components/atoms/sb-table/sb-table.models';
import { AdventureDetailResponse } from '../../../core/api/models';
import { AdventuresFeatureService } from '../../../features/adventures/adventures-feature.service';

type AdventureRow = { detail: AdventureDetailResponse };

const STATUS_ICONS: Record<string, string> = {
	completed: 'check_circle',
	in_progress: 'directions_walk',
	purchased: 'play_circle',
	revoked: 'block'
};

const STATUS_TONES: Record<string, SbTone> = {
	completed: 'success',
	in_progress: 'warning',
	purchased: 'info',
	abandoned: 'danger',
	revoked: 'danger'
};

@Component({
	selector: 'app-user-dashboard-screen',
	standalone: true,
	imports: [
		DatePipe,
		TranslatePipe,
		SbBadgeComponent,
		SbCellDirective,
		SbIconButtonComponent,
		SbPageHeaderComponent,
		SbProgressBarComponent,
		SbStatGridComponent,
		SbTableComponent
	],
	templateUrl: './user-dashboard.component.html',
	styleUrls: ['./user-dashboard.component.scss']
})
export class UserDashboardScreenComponent implements OnInit {
	private readonly router = inject(Router);
	private readonly adventuresFeature = inject(AdventuresFeatureService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly translate = inject(TranslateService);

	protected readonly adventures = signal<AdventureDetailResponse[]>([]);
	protected readonly loading = signal(true);
	protected readonly loadError = signal(false);
	protected readonly activeCount = computed(() => this.adventures().filter(({ adventure }) => adventure.progressStatus === 'in_progress').length);
	protected readonly completedCount = computed(() => this.adventures().filter(({ adventure }) => adventure.progressStatus === 'completed').length);
	protected readonly totalStages = computed(() => this.adventures().reduce((total, { stroll }) => total + (stroll?.stageCount ?? 0), 0));
	protected readonly replayingAdventureId = signal<string | null>(null);

	protected readonly rows = computed<AdventureRow[]>(() => this.adventures().map((detail) => ({ detail })));

	protected readonly summaryStats = computed(() => {
		this.translate.currentLang();
		return [
			{ label: this.translate.instant('SCREENS.USER_DASHBOARD.METRIC_TOTAL'), value: this.adventures().length },
			{ label: this.translate.instant('SCREENS.USER_DASHBOARD.METRIC_ACTIVE'), value: this.activeCount(), tone: 'warning' as SbTone },
			{ label: this.translate.instant('SCREENS.USER_DASHBOARD.METRIC_COMPLETED'), value: this.completedCount(), tone: 'success' as SbTone },
			{ label: this.translate.instant('SCREENS.USER_DASHBOARD.METRIC_STAGES'), value: this.totalStages() }
		];
	});

	protected readonly columns = computed<SbTableColumn<AdventureRow>[]>(() => {
		this.translate.currentLang();
		return [
			{ key: 'name', header: this.translate.instant('SCREENS.USER_DASHBOARD.COL_NAME') },
			{ key: 'status', header: this.translate.instant('SCREENS.USER_DASHBOARD.COL_STATUS') },
			{ key: 'progress', header: this.translate.instant('SCREENS.USER_DASHBOARD.COL_PROGRESS'), hideBelow: 'sm' },
			{ key: 'currentStage', header: this.translate.instant('SCREENS.USER_DASHBOARD.COL_CURRENT_STAGE'), hideBelow: 'md' },
			{ key: 'purchased', header: this.translate.instant('SCREENS.USER_DASHBOARD.COL_PURCHASED'), hideBelow: 'md' },
			{ key: 'activity', header: this.translate.instant('SCREENS.USER_DASHBOARD.COL_ACTIVITY'), hideBelow: 'md' },
			{ key: 'actions', header: this.translate.instant('SCREENS.USER_DASHBOARD.COL_ACTIONS'), align: 'end' }
		];
	});

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

	protected statusIcon(status: string): string {
		return STATUS_ICONS[status] ?? 'pause_circle';
	}

	protected statusTone(status: string): SbTone {
		return STATUS_TONES[status] ?? 'neutral';
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
