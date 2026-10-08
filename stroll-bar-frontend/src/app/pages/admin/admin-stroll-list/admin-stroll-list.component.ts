import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';

import { SbTone } from '../../../components/atoms/atom.types';
import { SbAlertComponent } from '../../../components/atoms/sb-alert/sb-alert.component';
import { SbBadgeComponent } from '../../../components/atoms/sb-badge/sb-badge.component';
import { SbButtonComponent } from '../../../components/atoms/sb-button/sb-button.component';
import { SbIconButtonComponent } from '../../../components/atoms/sb-icon-button/sb-icon-button.component';
import { SbPageHeaderComponent } from '../../../components/atoms/sb-page-header/sb-page-header.component';
import { SbStatGridComponent } from '../../../components/atoms/sb-stat-grid/sb-stat-grid.component';
import { SbCellDirective } from '../../../components/atoms/sb-table/sb-cell.directive';
import { SbTableComponent } from '../../../components/atoms/sb-table/sb-table.component';
import { SbTableColumn } from '../../../components/atoms/sb-table/sb-table.models';
import { SbTextareaComponent } from '../../../components/atoms/sb-textarea/sb-textarea.component';
import { BulkImportStrollRequest, Stroll } from '../../../core/api/models';
import { selectIsAdmin } from '../../../features/auth/auth.state';
import { StrollsFeatureService } from '../../../features/strolls/strolls-feature.service';
import { ConfirmDeleteDialogComponent } from '../../../shared/confirm-delete-dialog.component';

@Component({
	selector: 'app-admin-stroll-list-screen',
	standalone: true,
	imports: [
		DatePipe,
		FormsModule,
		TranslatePipe,
		SbAlertComponent,
		SbBadgeComponent,
		SbButtonComponent,
		SbCellDirective,
		SbIconButtonComponent,
		SbPageHeaderComponent,
		SbStatGridComponent,
		SbTableComponent,
		SbTextareaComponent
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './admin-stroll-list.component.html',
	styleUrl: './admin-stroll-list.component.scss'
})
export class AdminStrollListScreenComponent implements OnInit {
	private readonly router = inject(Router);
	private readonly strollsFeature = inject(StrollsFeatureService);
	private readonly dialog = inject(MatDialog);
	private readonly store = inject(Store);
	private readonly translate = inject(TranslateService);

	protected readonly isAdmin = this.store.selectSignal(selectIsAdmin);
	protected readonly strolls = signal<Stroll[]>([]);
	protected readonly loading = signal(true);
	protected readonly loadError = signal(false);
	protected readonly publishedCount = computed(() => this.strolls().filter((stroll) => stroll.activeStatus === 'published').length);
	protected readonly draftCount = computed(() => this.strolls().filter((stroll) => stroll.activeStatus === 'draft').length);
	protected readonly totalStages = computed(() => this.strolls().reduce((total, stroll) => total + stroll.stageCount, 0));
	protected readonly bulkJson = signal('');
	protected readonly bulkImporting = signal(false);
	protected readonly bulkImportError = signal('');
	protected readonly bulkImportSuccess = signal(false);

	protected readonly summaryStats = computed(() => {
		this.translate.currentLang();
		return [
			{ label: this.translate.instant('SCREENS.ADMIN_STROLL_LIST.METRIC_TOTAL'), value: this.strolls().length },
			{ label: this.translate.instant('SCREENS.ADMIN_STROLL_LIST.METRIC_PUBLISHED'), value: this.publishedCount(), tone: 'success' as SbTone },
			{ label: this.translate.instant('SCREENS.ADMIN_STROLL_LIST.METRIC_DRAFTS'), value: this.draftCount(), tone: 'warning' as SbTone },
			{ label: this.translate.instant('SCREENS.ADMIN_STROLL_LIST.METRIC_STAGES'), value: this.totalStages() }
		];
	});

	protected readonly columns = computed<SbTableColumn<Stroll>[]>(() => {
		this.translate.currentLang();
		return [
			{ key: 'name', header: this.translate.instant('SCREENS.ADMIN_STROLL_LIST.COL_NAME') },
			{ key: 'status', header: this.translate.instant('SCREENS.ADMIN_STROLL_LIST.COL_STATUS') },
			{ key: 'visibility', header: this.translate.instant('SCREENS.ADMIN_STROLL_LIST.COL_VISIBILITY'), hideBelow: 'md' },
			{ key: 'stageCount', header: this.translate.instant('SCREENS.ADMIN_STROLL_LIST.COL_STATIONS'), align: 'center', hideBelow: 'sm' },
			{ key: 'labels', header: this.translate.instant('SCREENS.ADMIN_STROLL_LIST.COL_LABELS'), hideBelow: 'md' },
			{ key: 'media', header: this.translate.instant('SCREENS.ADMIN_STROLL_LIST.COL_MEDIA'), align: 'center', hideBelow: 'md' },
			{ key: 'updated', header: this.translate.instant('SCREENS.ADMIN_STROLL_LIST.COL_UPDATED'), hideBelow: 'sm' },
			{ key: 'actions', header: this.translate.instant('SCREENS.ADMIN_STROLL_LIST.COL_ACTIONS'), align: 'end' }
		];
	});

	ngOnInit(): void {
		this.strollsFeature.listOwned({ limit: 100 }).subscribe({
			next: (response) => {
				this.strolls.set(response.items);
				this.loading.set(false);
			},
			error: () => {
				this.loadError.set(true);
				this.loading.set(false);
			}
		});
	}

	protected createStroll(): void {
		this.router.navigate(['/creator/strolls/new']);
	}

	protected editStroll(strollId: string): void {
		this.router.navigate(['/creator/strolls', strollId]);
	}

	protected mediaCount(stroll: Stroll): number {
		return (stroll.mediaUrls?.imageUrls?.length ?? 0) + (stroll.mediaUrls?.videoUrls?.length ?? 0);
	}

	protected statusTone(status: string): SbTone {
		if (status === 'published') return 'success';
		return status === 'draft' ? 'warning' : 'neutral';
	}

	protected statusIcon(status: string): string {
		if (status === 'published') return 'check_circle';
		return status === 'draft' ? 'edit_note' : 'archive';
	}

	protected visibilityIcon(flag: string): string {
		if (flag === 'public') return 'public';
		return flag === 'unlisted' ? 'link' : 'lock';
	}

	protected async deleteStroll(stroll: Stroll): Promise<void> {
		const confirmed = await firstValueFrom(
			this.dialog
				.open(ConfirmDeleteDialogComponent, {
					data: {
						titleKey: 'SCREENS.ADMIN_STROLL_LIST.DELETE_CONFIRM_TITLE',
						messageKey: 'SCREENS.ADMIN_STROLL_LIST.DELETE_CONFIRM_MESSAGE',
						itemName: stroll.name
					},
					maxWidth: 'calc(100vw - 32px)',
					width: '420px'
				})
				.afterClosed()
		);
		if (!confirmed) return;

		const strollId = stroll.id;
		this.strollsFeature.remove(strollId).subscribe({
			next: () => this.strolls.update((strolls) => strolls.filter((stroll) => stroll.id !== strollId)),
			error: () => this.loadError.set(true)
		});
	}

	protected importBulkJson(): void {
		this.bulkImportError.set('');
		this.bulkImportSuccess.set(false);
		let payload: unknown;
		try {
			payload = JSON.parse(this.bulkJson());
		} catch {
			this.bulkImportError.set('SCREENS.ADMIN_STROLL_LIST.BULK_INVALID_JSON');
			return;
		}

		if (!this.isValidPayload(payload)) {
			this.bulkImportError.set('SCREENS.ADMIN_STROLL_LIST.BULK_INVALID_SHAPE');
			return;
		}

		this.bulkImporting.set(true);
		this.strollsFeature.bulkImport(payload).subscribe({
			next: (result) => {
				this.strolls.update((strolls) => [...strolls, result.stroll]);
				this.bulkJson.set('');
				this.bulkImportSuccess.set(true);
				this.bulkImporting.set(false);
			},
			error: () => {
				this.bulkImportError.set('SCREENS.ADMIN_STROLL_LIST.BULK_SERVER_ERROR');
				this.bulkImporting.set(false);
			}
		});
	}

	private isValidPayload(value: unknown): value is BulkImportStrollRequest {
		if (!value || typeof value !== 'object') return false;
		const payload = value as { stroll?: unknown; stages?: unknown };
		if (!payload.stroll || typeof payload.stroll !== 'object' || !Array.isArray(payload.stages)) return false;
		const stroll = payload.stroll as { name?: unknown; description?: unknown; labels?: unknown };
		return (
			typeof stroll.name === 'string' &&
			stroll.name.trim().length >= 3 &&
			typeof stroll.description === 'string' &&
			stroll.description.trim().length >= 10 &&
			(stroll.labels === undefined || (Array.isArray(stroll.labels) && stroll.labels.every((label) => typeof label === 'string'))) &&
			payload.stages.every((stage) => this.isStage(stage))
		);
	}

	private isStage(value: unknown): boolean {
		if (!value || typeof value !== 'object') return false;
		const stage = value as { name?: unknown; description?: unknown; orderIndex?: unknown };
		return (
			typeof stage.name === 'string' &&
			stage.name.trim().length >= 2 &&
			typeof stage.description === 'string' &&
			stage.description.trim().length >= 10 &&
			typeof stage.orderIndex === 'number' &&
			Number.isInteger(stage.orderIndex) &&
			stage.orderIndex >= 1
		);
	}
}
