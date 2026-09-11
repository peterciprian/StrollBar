import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AdminStrollReportEntry } from '../../../core/api/models';
import { IssuesFeatureService } from '../../../features/issues/issues-feature.service';

@Component({
	selector: 'app-admin-issues-screen',
	standalone: true,
	imports: [CommonModule, MatIconModule, MatTableModule, MatTooltipModule, TranslatePipe],
	templateUrl: './admin-issues.component.html',
	styleUrls: ['./admin-issues.component.scss']
})
export class AdminIssuesScreenComponent implements OnInit {
	private readonly issuesFeature = inject(IssuesFeatureService);
	private readonly router = inject(Router);
	private readonly destroyRef = inject(DestroyRef);

	protected readonly displayedColumns = ['stroll', 'author', 'message', 'reportedAt'];
	protected readonly entries = signal<AdminStrollReportEntry[]>([]);
	protected readonly loading = signal(true);
	protected readonly loadError = signal(false);
	protected readonly affectedStrollCount = computed(() => new Set(this.entries().map((entry) => entry.stroll?.id)).size);

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
