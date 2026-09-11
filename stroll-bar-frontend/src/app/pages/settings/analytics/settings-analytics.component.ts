import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AnalyticsFeatureService } from '../../../features/analytics/analytics-feature.service';
import { AnalyticsSummaryResponse } from '../../../core/api/models';
import { formatDuration } from '../../../core/utils/duration.util';

interface AnalyticsStatCard {
	icon: string;
	labelKey: string;
	value: string;
	subtitle?: string;
	route?: string[];
}

@Component({
	selector: 'app-settings-analytics',
	standalone: true,
	imports: [MatIconModule, TranslatePipe],
	templateUrl: './settings-analytics.component.html',
	styleUrls: ['./settings-analytics.component.scss']
})
export class SettingsAnalyticsComponent implements OnInit {
	private readonly analyticsFeature = inject(AnalyticsFeatureService);
	private readonly router = inject(Router);
	private readonly translate = inject(TranslateService);
	private readonly destroyRef = inject(DestroyRef);

	protected readonly summary = signal<AnalyticsSummaryResponse | null>(null);
	protected readonly loading = signal(true);
	protected readonly loadError = signal(false);

	protected readonly analyticsStats = computed<AnalyticsStatCard[]>(() => {
		const summary = this.summary();
		if (!summary) return [];

		return [
			{
				icon: 'edit_road',
				labelKey: 'SETTINGS.STAT_CREATED_STROLLS',
				value: String(summary.createdStrollsCount),
				route: ['/strolls']
			},
			{
				icon: 'shopping_bag',
				labelKey: 'SETTINGS.STAT_PURCHASED_STROLLS',
				value: String(summary.purchasedStrollsCount),
				route: ['/user-dashboard']
			},
			{
				icon: 'map',
				labelKey: 'SETTINGS.STAT_ACTIVE_STROLLS',
				value: String(summary.activeStrollsCount),
				route: ['/user-dashboard']
			},
			{
				icon: 'flag',
				labelKey: 'SETTINGS.STAT_COMPLETED_STROLLS',
				value: String(summary.completedStrollsCount),
				route: ['/settings/achievements']
			},
			{
				icon: 'task_alt',
				labelKey: 'SETTINGS.STAT_COMPLETION_RATE',
				value: `${summary.completionRate}%`
			},
			{
				icon: 'bolt',
				labelKey: 'SETTINGS.STAT_SHORTEST_TIME',
				value: summary.shortestCompletion ? this.formatTime(summary.shortestCompletion.elapsedSeconds) : '—',
				subtitle: summary.shortestCompletion?.strollName,
				route: summary.shortestCompletion ? ['/settings/achievements'] : undefined
			},
			{
				icon: 'schedule',
				labelKey: 'SETTINGS.STAT_AVG_TIME',
				value: summary.avgCompletionSeconds ? this.formatTime(summary.avgCompletionSeconds) : '—'
			},
			{
				icon: 'rate_review',
				labelKey: 'SETTINGS.STAT_REVIEWS',
				value: String(summary.reviewsCount),
				route: ['/settings/reviews']
			},
			{
				icon: 'emoji_events',
				labelKey: 'SETTINGS.STAT_BADGES',
				value: String(summary.badgesCount),
				route: ['/settings/achievements']
			}
		];
	});

	ngOnInit(): void {
		this.analyticsFeature
			.getSummary()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (summary) => {
					this.summary.set(summary);
					this.loading.set(false);
				},
				error: () => {
					this.loadError.set(true);
					this.loading.set(false);
				}
			});
	}

	protected openStat(stat: AnalyticsStatCard): void {
		if (stat.route) {
			this.router.navigate(stat.route);
		}
	}

	private formatTime(totalSeconds: number): string {
		return formatDuration(totalSeconds, (key, params) => this.translate.instant(key, params));
	}
}
