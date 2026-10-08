import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SbBadgeComponent } from '../../../components/atoms/sb-badge/sb-badge.component';
import { SbButtonComponent } from '../../../components/atoms/sb-button/sb-button.component';
import { SbPageHeaderComponent } from '../../../components/atoms/sb-page-header/sb-page-header.component';
import { SbStatGridComponent } from '../../../components/atoms/sb-stat-grid/sb-stat-grid.component';
import { SbCellDirective } from '../../../components/atoms/sb-table/sb-cell.directive';
import { SbTableComponent } from '../../../components/atoms/sb-table/sb-table.component';
import { SbTableColumn } from '../../../components/atoms/sb-table/sb-table.models';
import { AdminStrollReportEntry } from '../../../core/api/models';
import { IssuesFeatureService } from '../../../features/issues/issues-feature.service';

type IssueRow = AdminStrollReportEntry & Record<string, unknown>;

@Component({
	selector: 'app-admin-issues-screen',
	standalone: true,
	imports: [
		DatePipe,
		TranslatePipe,
		SbBadgeComponent,
		SbButtonComponent,
		SbCellDirective,
		SbPageHeaderComponent,
		SbStatGridComponent,
		SbTableComponent
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './admin-issues.component.html',
	styleUrl: './admin-issues.component.scss'
})
export class AdminIssuesScreenComponent implements OnInit {
	private readonly issuesFeature = inject(IssuesFeatureService);
	private readonly router = inject(Router);
	private readonly destroyRef = inject(DestroyRef);
	private readonly translate = inject(TranslateService);

	protected readonly displayedColumns = ['stroll', 'author', 'message', 'reportedAt'];
	protected readonly entries = signal<AdminStrollReportEntry[]>([]);
	protected readonly loading = signal(true);
	protected readonly loadError = signal(false);
	protected readonly affectedStrollCount = computed(() => new Set(this.entries().map((entry) => entry.stroll?.id)).size);

	protected readonly summaryStats = computed(() => {
		this.translate.currentLang();
		return [
			{ label: this.translate.instant('SCREENS.ADMIN_ISSUES.METRIC_TOTAL'), value: this.entries().length },
			{ label: this.translate.instant('SCREENS.ADMIN_ISSUES.METRIC_STROLLS'), value: this.affectedStrollCount() }
		];
	});

	protected readonly rows = computed(() => this.entries() as IssueRow[]);

	protected readonly columns = computed<SbTableColumn<IssueRow>[]>(() => {
		this.translate.currentLang();
		return [
			{ key: 'stroll', header: this.translate.instant('SCREENS.ADMIN_ISSUES.COL_STROLL') },
			{ key: 'author', header: this.translate.instant('SCREENS.ADMIN_ISSUES.COL_AUTHOR'), hideBelow: 'md' },
			{ key: 'message', header: this.translate.instant('SCREENS.ADMIN_ISSUES.COL_MESSAGE') },
			{ key: 'reportedAt', header: this.translate.instant('SCREENS.ADMIN_ISSUES.COL_REPORTED_AT'), hideBelow: 'sm' }
		];
	});

	ngOnInit(): void {
		this.issuesFeature
			.listAll()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (entries) => {
					this.entries.set(this.groupByStroll(entries));
					this.loading.set(false);
				},
				error: () => {
					this.loadError.set(true);
					this.loading.set(false);
				}
			});
	}

	protected openStrollEditor(entry: AdminStrollReportEntry): void {
		if (!entry.stroll) {
			return;
		}
		this.router.navigate(['/creator/strolls', entry.stroll.id]);
	}

	// Keep reports for the same stroll adjacent so the grid reads as "grouped by stroll".
	private groupByStroll(entries: AdminStrollReportEntry[]): AdminStrollReportEntry[] {
		return [...entries].sort((left, right) => {
			const nameCompare = (left.stroll?.name ?? '').localeCompare(right.stroll?.name ?? '');
			if (nameCompare !== 0) {
				return nameCompare;
			}
			return new Date(right.report.createdAt).getTime() - new Date(left.report.createdAt).getTime();
		});
	}
}
