import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { SbAlertComponent } from '../../components/atoms/sb-alert/sb-alert.component';
import { SbButtonComponent } from '../../components/atoms/sb-button/sb-button.component';
import { firstValueFrom } from 'rxjs';
import { StrollsFeatureService } from '../../features/strolls/strolls-feature.service';
import {
	CreateStageRequest,
	CreateStrollRequest,
	Stage,
	StrollActiveStatus,
	StrollCategory,
	StrollDetailResponse,
	StrollPublicityFlag
} from '../../core/api/models';
import { EditableStage, EditableStroll } from './creator-editor.models';
import { MediaChange } from './media-manager.component';
import { StrollDetailsEditorComponent } from './stroll-details-editor.component';
import { StageListEditorComponent } from './stage-list-editor.component';
import { StageDetailEditorComponent } from './stage-detail-editor.component';
import { ConfirmDeleteDialogComponent } from '../../shared/confirm-delete-dialog.component';
import { UnsavedChangesDialogComponent, UnsavedChangesDialogResult } from '../../shared/unsaved-changes-dialog.component';
import { CanComponentDeactivate } from '../../core/guards/unsaved-changes.guard';
import { extractErrorCode } from '../../core/utils/http-error.util';
import { AppErrorCode } from '../../core/models/app-error-code';

@Component({
	selector: 'app-stroll-editor-page',
	standalone: true,
	imports: [
		CommonModule,
		SbAlertComponent,
		SbButtonComponent,
		TranslatePipe,
		StrollDetailsEditorComponent,
		StageListEditorComponent,
		StageDetailEditorComponent
	],
	templateUrl: './stroll-editor-page.component.html',
	styleUrls: ['./stroll-editor-page.component.scss']
})
export class StrollEditorPageComponent implements OnInit, CanComponentDeactivate {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly strollsFeature = inject(StrollsFeatureService);
	private readonly dialog = inject(MatDialog);
	protected readonly activeStatuses: StrollActiveStatus[] = ['draft', 'published', 'archived'];
	protected readonly publicityFlags: StrollPublicityFlag[] = ['private', 'unlisted', 'public'];
	protected readonly categories = Object.values(StrollCategory);
	protected readonly loading = signal(true);
	protected strollId: string | null = null;
	protected isNewStroll = true;
	protected stroll: EditableStroll = this.blankStroll();
	protected stages: EditableStage[] = [];
	protected selectedStageId: string | null = null;
	protected saving = false;
	protected saved = false;
	protected saveError = false;
	protected saveErrorKey = 'SCREENS.ADMIN_STATION_EDITOR.SAVE_ERROR';
	protected validationErrors: string[] = [];
	protected autoUnpublished = false;
	private pristineSnapshot = '';
	private allowNavigation = false;
	private persistedStatus: StrollActiveStatus = 'draft';

	ngOnInit(): void {
		const strollId = this.route.snapshot.paramMap.get('strollId');
		if (!strollId || strollId === 'new') {
			this.loading.set(false);
			this.markPristine();
			return;
		}
		this.strollsFeature.getOwnedDetail(strollId).subscribe({ next: (detail) => this.applyDetail(detail), error: () => this.loading.set(false) });
	}

	async canDeactivate(): Promise<boolean> {
		if (this.allowNavigation || !this.hasUnsavedChanges()) return true;
		const result = await firstValueFrom(
			this.dialog
				.open<UnsavedChangesDialogComponent, void, UnsavedChangesDialogResult>(UnsavedChangesDialogComponent, {
					disableClose: true,
					maxWidth: 'calc(100vw - 32px)',
					width: '420px'
				})
				.afterClosed()
		);
		if (result === 'discard') return true;
		if (result !== 'save') return false;
		return await this.saveChanges();
	}

	protected hasUnsavedChanges(): boolean {
		return this.snapshot() !== this.pristineSnapshot;
	}

	private snapshot(): string {
		return JSON.stringify({ stroll: this.stroll, stages: this.stages });
	}

	private markPristine(): void {
		this.pristineSnapshot = this.snapshot();
	}

	protected get selectedStage(): EditableStage | null {
		return this.stages.find((stage) => stage.id === this.selectedStageId) ?? null;
	}

	protected selectStage(id: string): void {
		this.selectedStageId = id;
		this.saved = false;
	}

	protected addStage(): void {
		const stage: EditableStage = {
			id: `new-${Date.now()}`,
			isNew: true,
			orderIndex: this.stages.length + 1,
			name: '',
			address: '',
			latitude: 47.4979,
			longitude: 19.0402,
			description: '',
			riddleAnswer: '',
			imageUrls: [],
			videoUrls: []
		};
		this.stages = [...this.stages, stage];
		this.selectedStageId = stage.id;
	}

	protected async deleteStage(stage: EditableStage): Promise<void> {
		const confirmed = await firstValueFrom(
			this.dialog
				.open(ConfirmDeleteDialogComponent, {
					data: {
						titleKey: 'SCREENS.ADMIN_STATION_EDITOR.DELETE_STAGE_CONFIRM_TITLE',
						messageKey: 'SCREENS.ADMIN_STATION_EDITOR.DELETE_STAGE_CONFIRM_MESSAGE',
						itemName: stage.name || 'New stage'
					},
					maxWidth: 'calc(100vw - 32px)',
					width: '420px'
				})
				.afterClosed()
		);
		if (!confirmed) return;

		if (stage.isNew || !this.strollId) {
			this.removeStageLocally(stage.id);
			return;
		}
		this.strollsFeature
			.removeStage(this.strollId, stage.id)
			.subscribe({
				next: () => {
					this.removeStageLocally(stage.id);
					void this.refreshPersistedStatus();
				},
				error: () => (this.saveError = true)
			});
	}

	protected onStagesChange(stages: EditableStage[]): void {
		this.stages = stages;
	}
	protected onStrollMediaChange(media: MediaChange): void {
		this.stroll.imageUrls = media.imageUrls;
		this.stroll.videoUrls = media.videoUrls;
	}
	protected onStageMediaChange(media: MediaChange): void {
		const stage = this.selectedStage;
		if (stage) {
			stage.imageUrls = media.imageUrls;
			stage.videoUrls = media.videoUrls;
		}
	}
	protected onLocationChange(location: { latitude: number; longitude: number }): void {
		const stage = this.selectedStage;
		if (stage) Object.assign(stage, location);
	}

	protected async saveChanges(): Promise<boolean> {
		if (this.saving) return false;
		const requestedStatus = this.stroll.status;
		const wasPublished = this.persistedStatus === 'published';
		const saveStatus =
			requestedStatus === 'published' && (this.isNewStroll || !wasPublished) ? 'draft' : requestedStatus;
		this.saving = true;
		this.saved = false;
		this.saveError = false;
		this.validationErrors = [];
		this.autoUnpublished = false;
		try {
			await this.saveStroll(saveStatus);
			await this.saveStages();
			if (requestedStatus === 'published') {
				await firstValueFrom(this.strollsFeature.update(this.strollId!, { activeStatus: 'published' }));
			}
			const detail = this.strollId ? await firstValueFrom(this.strollsFeature.getOwnedDetail(this.strollId)) : null;
			const actualStatus = detail?.stroll.activeStatus ?? saveStatus;
			this.persistedStatus = actualStatus;
			this.stroll.status = actualStatus;
			this.autoUnpublished = wasPublished && requestedStatus === 'published' && actualStatus !== 'published';
			this.saved = true;
			this.markPristine();
			return true;
		} catch (error) {
			if (extractErrorCode(error) === AppErrorCode.STROLL_NOT_READY) {
				this.validationErrors = this.readinessErrorKeys(error);
				this.stroll.status = 'draft';
				this.persistedStatus = 'draft';
				this.autoUnpublished = wasPublished && requestedStatus === 'published';
				this.saved = wasPublished;
				this.markPristine();
				return wasPublished;
			}
			this.saveErrorKey = this.resolveSaveErrorKey(error);
			this.saveError = true;
			return false;
		} finally {
			this.saving = false;
		}
	}

	private resolveSaveErrorKey(error: unknown): string {
		switch (extractErrorCode(error)) {
			case AppErrorCode.EMAIL_NOT_VERIFIED:
				return 'ERRORS.EMAIL_NOT_VERIFIED';
			case AppErrorCode.STROLL_PUBLICITY_NOT_ALLOWED:
				return 'ERRORS.STROLL_PUBLICITY_NOT_ALLOWED';
			case AppErrorCode.STROLL_QUOTA_REACHED:
				return 'ERRORS.STROLL_QUOTA_REACHED';
			case AppErrorCode.STROLL_NOT_READY:
				return 'SCREENS.ADMIN_STATION_EDITOR.READINESS_TITLE';
			default:
				return 'SCREENS.ADMIN_STATION_EDITOR.SAVE_ERROR';
		}
	}

	private readinessErrorKeys(error: unknown): string[] {
		const body = (error as { error?: { error?: { errors?: Array<{ code?: string }> }; errors?: Array<{ code?: string }> } })?.error;
		const errors = body?.error?.errors ?? body?.errors ?? [];
		const keys = errors
			.map((issue) => {
				switch (issue.code) {
					case 'STROLL_NAME_REQUIRED':
						return 'SCREENS.ADMIN_STATION_EDITOR.READINESS.STROLL_NAME_REQUIRED';
					case 'STROLL_DESCRIPTION_REQUIRED':
						return 'SCREENS.ADMIN_STATION_EDITOR.READINESS.STROLL_DESCRIPTION_REQUIRED';
					case 'STROLL_STAGE_REQUIRED':
						return 'SCREENS.ADMIN_STATION_EDITOR.READINESS.STROLL_STAGE_REQUIRED';
					case 'STAGE_NAME_REQUIRED':
						return 'SCREENS.ADMIN_STATION_EDITOR.READINESS.STAGE_NAME_REQUIRED';
					case 'STAGE_DESCRIPTION_REQUIRED':
						return 'SCREENS.ADMIN_STATION_EDITOR.READINESS.STAGE_DESCRIPTION_REQUIRED';
					case 'STAGE_LOCATION_REQUIRED':
						return 'SCREENS.ADMIN_STATION_EDITOR.READINESS.STAGE_LOCATION_REQUIRED';
					default:
						return '';
				}
			})
			.filter(Boolean);
		return keys.length ? [...new Set(keys)] : ['SCREENS.ADMIN_STATION_EDITOR.READINESS_GENERIC'];
	}

	private async saveStroll(activeStatus: StrollActiveStatus): Promise<void> {
		const payload: CreateStrollRequest = {
			name: this.stroll.name,
			description: this.stroll.description,
			labels: this.stroll.labelsText
				.split(',')
				.map((label) => label.trim())
				.filter(Boolean),
			category: this.stroll.category,
			activeStatus,
			publicityFlag: this.stroll.publicity,
			price:
				this.stroll.publicity === 'private' && this.stroll.priceAmount !== null
					? { amount: this.stroll.priceAmount, currency: this.stroll.priceCurrency || 'HUF' }
					: null,
			imageUrls: this.stroll.imageUrls,
			videoUrls: this.stroll.videoUrls
		};
		if (this.isNewStroll) {
			const created = await firstValueFrom(this.strollsFeature.create(payload));
			this.strollId = created.id;
			this.isNewStroll = false;
			this.allowNavigation = true;
			try {
				await this.router.navigate(['/creator/strolls', created.id], { replaceUrl: true });
			} finally {
				this.allowNavigation = false;
			}
			return;
		}
		await firstValueFrom(this.strollsFeature.update(this.strollId!, payload));
	}

	private async refreshPersistedStatus(): Promise<void> {
		if (!this.strollId) return;
		try {
			const detail = await firstValueFrom(this.strollsFeature.getOwnedDetail(this.strollId));
			const wasPublished = this.persistedStatus === 'published';
			this.persistedStatus = detail.stroll.activeStatus;
			this.stroll.status = detail.stroll.activeStatus;
			this.autoUnpublished = wasPublished && detail.stroll.activeStatus === 'draft';
			if (this.autoUnpublished) this.markPristine();
		} catch {
			this.saveError = true;
		}
	}

	private async saveStages(): Promise<void> {
		if (!this.strollId) return;
		this.stages.forEach((stage, index) => (stage.orderIndex = index + 1));
		for (const stage of this.stages) {
			const payload: CreateStageRequest = {
				orderIndex: stage.orderIndex,
				name: stage.name,
				description: stage.description,
				address: stage.address || undefined,
				latitude: stage.latitude,
				longitude: stage.longitude,
				imageUrls: stage.imageUrls,
				videoUrls: stage.videoUrls,
				...(stage.riddleAnswer ? { riddleAnswer: stage.riddleAnswer } : {})
			};
			if (stage.isNew) {
				const created = await firstValueFrom(this.strollsFeature.createStage(this.strollId, payload));
				stage.id = created.id;
				stage.isNew = false;
			} else {
				await firstValueFrom(this.strollsFeature.updateStage(this.strollId, stage.id, payload));
			}
		}
		if (this.stages.length)
			await firstValueFrom(
				this.strollsFeature.reorderStages(this.strollId, {
					items: this.stages.map((stage) => ({ stageId: stage.id, orderIndex: stage.orderIndex }))
				})
			);
	}

	private applyDetail(detail: StrollDetailResponse): void {
		this.strollId = detail.stroll.id;
		this.isNewStroll = false;
		this.persistedStatus = detail.stroll.activeStatus;
		this.stroll = {
			name: detail.stroll.name,
			description: detail.stroll.description,
			labelsText: (detail.stroll.labels ?? []).join(', '),
			category: detail.stroll.category ?? StrollCategory.ENTERTAINMENT,
			status: detail.stroll.activeStatus,
			publicity: detail.stroll.publicityFlag,
			priceAmount: detail.stroll.price?.amount ?? null,
			priceCurrency: detail.stroll.price?.currency ?? 'HUF',
			imageUrls: detail.stroll.mediaUrls?.imageUrls ?? [],
			videoUrls: detail.stroll.mediaUrls?.videoUrls ?? []
		};
		this.stages = detail.stages
			.slice()
			.sort((left, right) => left.orderIndex - right.orderIndex)
			.map((stage) => this.toEditableStage(stage));
		this.selectedStageId = this.stages[0]?.id ?? null;
		this.loading.set(false);
		this.markPristine();
	}

	private toEditableStage(stage: Stage): EditableStage {
		return {
			id: stage.id,
			isNew: false,
			orderIndex: stage.orderIndex,
			name: stage.name,
			address: stage.address ?? '',
			latitude: stage.latitude ?? 47.4979,
			longitude: stage.longitude ?? 19.0402,
			description: stage.description,
			riddleAnswer: '',
			imageUrls: stage.imageUrls ?? [],
			videoUrls: stage.videoUrls ?? []
		};
	}
	private removeStageLocally(id: string): void {
		this.stages = this.stages.filter((stage) => stage.id !== id);
		if (this.selectedStageId === id) this.selectedStageId = this.stages[0]?.id ?? null;
	}
	private blankStroll(): EditableStroll {
		return {
			name: '',
			description: '',
			labelsText: '',
			category: StrollCategory.ENTERTAINMENT,
			status: 'draft',
			publicity: 'private',
			priceAmount: null,
			priceCurrency: 'HUF',
			imageUrls: [],
			videoUrls: []
		};
	}
}
