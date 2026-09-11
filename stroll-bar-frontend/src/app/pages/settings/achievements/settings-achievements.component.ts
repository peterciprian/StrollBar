import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AchievementsFeatureService } from '../../../features/achievements/achievements-feature.service';
import { AdventureResult, AdventureResultWithStroll, BadgeCatalogEntry } from '../../../core/api/models';
import { formatDuration } from '../../../core/utils/duration.util';

interface StrollResultGroup {
	strollId: string;
	strollName: string;
	results: AdventureResult[];
}

@Component({
	selector: 'app-settings-achievements',
	standalone: true,
	imports: [CommonModule, MatIconModule, TranslatePipe],
	templateUrl: './settings-achievements.component.html',
	styleUrls: ['./settings-achievements.component.scss']
})
export class SettingsAchievementsComponent implements OnInit {
	private readonly achievementsFeature = inject(AchievementsFeatureService);
	private readonly translate = inject(TranslateService);
	private readonly destroyRef = inject(DestroyRef);

	protected readonly resultGroups = signal<StrollResultGroup[]>([]);
	protected readonly resultsLoading = signal(true);
	protected readonly resultsError = signal(false);

	protected readonly badges = signal<BadgeCatalogEntry[]>([]);
	protected readonly badgesLoading = signal(true);
	protected readonly badgesError = signal(false);

	ngOnInit(): void {
		this.achievementsFeature
			.listResults()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (entries) => {
					this.resultGroups.set(this.groupByStroll(entries));
					this.resultsLoading.set(false);
				},
				error: () => {
					this.resultsError.set(true);
					this.resultsLoading.set(false);
				}
			});

		this.achievementsFeature
			.listBadges()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (badges) => {
					this.badges.set(badges);
					this.badgesLoading.set(false);
				},
				error: () => {
					this.badgesError.set(true);
					this.badgesLoading.set(false);
				}
			});
	}

	protected formatTime(totalSeconds: number): string {
		return formatDuration(totalSeconds, (key, params) => this.translate.instant(key, params));
	}

	private groupByStroll(entries: AdventureResultWithStroll[]): StrollResultGroup[] {
		const groups = new Map<string, StrollResultGroup>();

		for (const entry of entries) {
			const strollId = entry.result.strollId;
			const group = groups.get(strollId) ?? { strollId, strollName: entry.stroll?.name ?? '—', results: [] };
			group.results.push(entry.result);
			groups.set(strollId, group);
		}

		return [...groups.values()];
	}
}
