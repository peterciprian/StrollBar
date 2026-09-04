import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AchievementsFeatureService } from '../../../features/achievements/achievements-feature.service';
import { AdventureResult, AdventureResultWithStroll } from '../../../core/api/models';
import { formatDuration } from '../../../core/utils/duration.util';

interface Achievement {
	icon: string;
	title: string;
	description: string;
	earnedOn: string;
}

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

	// Badge/milestone concept, not yet wired to backend data.
	protected readonly achievements: Achievement[] = [
		{ icon: 'castle', title: 'Bastion Explorer', description: "Completed the Fisherman's Bastion Mystery stroll", earnedOn: '12 May 2026' },
		{ icon: 'psychology', title: 'Riddle Master', description: 'Solved 10 station riddles without a hint', earnedOn: '28 May 2026' },
		{ icon: 'water', title: 'Danube Wanderer', description: 'Completed the Danube Legends & Chain Bridge stroll', earnedOn: '3 June 2026' },
		{ icon: 'hiking', title: 'Weekend Wanderer', description: 'Completed 3 strolls in a single weekend', earnedOn: '15 June 2026' }
	];

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
