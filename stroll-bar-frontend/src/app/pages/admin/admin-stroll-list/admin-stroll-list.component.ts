import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { BulkImportStrollRequest, Stroll } from '../../../core/api/models';
import { StrollsFeatureService } from '../../../features/strolls/strolls-feature.service';
import { ConfirmDeleteDialogComponent } from '../../../shared/confirm-delete-dialog.component';

@Component({
	selector: 'app-admin-stroll-list-screen',
	standalone: true,
	imports: [CommonModule, FormsModule, UpperCasePipe, MatButtonModule, MatIconModule, MatTableModule, MatTooltipModule, TranslatePipe],
	templateUrl: './admin-stroll-list.component.html',
	styleUrls: ['./admin-stroll-list.component.scss']
})
export class AdminStrollListScreenComponent implements OnInit {
	private readonly router = inject(Router);
	private readonly strollsFeature = inject(StrollsFeatureService);
	private readonly dialog = inject(MatDialog);

	protected readonly displayedColumns = ['name', 'status', 'visibility', 'stations', 'labels', 'media', 'updated', 'actions'];
	protected readonly strolls = signal<Stroll[]>([]);
	protected readonly loading = signal(true);
	protected readonly loadError = signal(false);
	protected readonly publishedCount = computed(() => this.strolls().filter((stroll) => stroll.activeStatus === 'published').length);
	protected readonly draftCount = computed(() => this.strolls().filter((stroll) => stroll.activeStatus === 'draft').length);
	protected readonly totalStages = computed(() => this.strolls().reduce((total, stroll) => total + stroll.stageCount, 0));
	protected bulkJson = '';
	protected bulkImporting = false;
	protected bulkImportError = '';
	protected bulkImportSuccess = false;

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
		this.bulkImportError = '';
		this.bulkImportSuccess = false;
		let payload: unknown;
		try {
			payload = JSON.parse(this.bulkJson);
		} catch {
			this.bulkImportError = 'SCREENS.ADMIN_STROLL_LIST.BULK_INVALID_JSON';
			return;
		}

		if (!this.isValidPayload(payload)) {
			this.bulkImportError = 'SCREENS.ADMIN_STROLL_LIST.BULK_INVALID_SHAPE';
			return;
		}

		this.bulkImporting = true;
		this.strollsFeature.bulkImport(payload).subscribe({
			next: (result) => {
				this.strolls.update((strolls) => [...strolls, result.stroll]);
				this.bulkJson = '';
				this.bulkImportSuccess = true;
				this.bulkImporting = false;
			},
			error: () => {
				this.bulkImportError = 'SCREENS.ADMIN_STROLL_LIST.BULK_SERVER_ERROR';
				this.bulkImporting = false;
			}
		});
	}

	private isValidPayload(value: unknown): value is BulkImportStrollRequest {
		if (!value || typeof value !== 'object') return false;
		const payload = value as { stroll?: unknown; stages?: unknown };
		if (!payload.stroll || typeof payload.stroll !== 'object' || !Array.isArray(payload.stages)) return false;
		const stroll = payload.stroll as { name?: unknown; description?: unknown; labels?: unknown; mediaUrls?: unknown };
		return (
			typeof stroll.name === 'string' &&
			stroll.name.trim().length >= 3 &&
			typeof stroll.description === 'string' &&
			stroll.description.trim().length >= 10 &&
			Array.isArray(stroll.labels) &&
			stroll.labels.every((label) => typeof label === 'string') &&
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
			stage.orderIndex >= 0
		);
	}
}
