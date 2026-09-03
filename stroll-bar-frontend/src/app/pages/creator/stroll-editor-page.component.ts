import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { StrollsFeatureService } from '../../features/strolls/strolls-feature.service';
import { CreateStageRequest, CreateStrollRequest, Stage, StrollActiveStatus, StrollDetailResponse, StrollPublicityFlag } from '../../core/api/models';
import { EditableStage, EditableStroll } from './creator-editor.models';
import { MediaChange } from './media-manager.component';
import { StrollDetailsEditorComponent } from './stroll-details-editor.component';
import { StageListEditorComponent } from './stage-list-editor.component';
import { StageDetailEditorComponent } from './stage-detail-editor.component';
import { ConfirmDeleteDialogComponent } from '../../shared/confirm-delete-dialog.component';

@Component({
	selector: 'app-stroll-editor-page',
	standalone: true,
	imports: [
		CommonModule,
		MatButtonModule,
		MatIconModule,
		TranslatePipe,
		StrollDetailsEditorComponent,
		StageListEditorComponent,
		StageDetailEditorComponent
	],
	templateUrl: './stroll-editor-page.component.html',
	styleUrls: ['./stroll-editor-page.component.scss']
})
export class StrollEditorPageComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly strollsFeature = inject(StrollsFeatureService);
	private readonly dialog = inject(MatDialog);
	protected readonly activeStatuses: StrollActiveStatus[] = ['draft', 'published', 'archived'];
	protected readonly publicityFlags: StrollPublicityFlag[] = ['private', 'unlisted', 'public'];
	protected readonly loading = signal(true);
	protected strollId: string | null = null;
	protected isNewStroll = true;
	protected stroll: EditableStroll = this.blankStroll();
	protected stages: EditableStage[] = [];
	protected selectedStageId: string | null = null;
	protected saving = false;
	protected saved = false;
	protected saveError = false;

	ngOnInit(): void {
		const strollId = this.route.snapshot.paramMap.get('strollId');
		if (!strollId || strollId === 'new') {
			this.loading.set(false);
			return;
		}
		this.strollsFeature.getOwnedDetail(strollId).subscribe({ next: (detail) => this.applyDetail(detail), error: () => this.loading.set(false) });
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
			.subscribe({ next: () => this.removeStageLocally(stage.id), error: () => (this.saveError = true) });
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

	protected async saveChanges(): Promise<void> {
		if (!this.stroll.name.trim() || !this.stroll.description.trim() || this.saving) return;
		this.saving = true;
		this.saved = false;
		this.saveError = false;
		try {
			await this.saveStroll();
			await this.saveStages();
			this.saved = true;
		} catch {
			this.saveError = true;
		} finally {
			this.saving = false;
		}
	}

	private async saveStroll(): Promise<void> {
		const payload: CreateStrollRequest = {
			name: this.stroll.name,
			description: this.stroll.description,
			labels: this.stroll.labelsText
				.split(',')
				.map((label) => label.trim())
				.filter(Boolean),
			activeStatus: this.stroll.status,
			publicityFlag: this.stroll.publicity,
			imageUrls: this.stroll.imageUrls,
			videoUrls: this.stroll.videoUrls
		};
		if (this.isNewStroll) {
			const created = await firstValueFrom(this.strollsFeature.create(payload));
			this.strollId = created.id;
			this.isNewStroll = false;
			await this.router.navigate(['/creator/strolls', created.id], { replaceUrl: true });
			return;
		}
		await firstValueFrom(this.strollsFeature.update(this.strollId!, payload));
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
		this.stroll = {
			name: detail.stroll.name,
			description: detail.stroll.description,
			labelsText: (detail.stroll.labels ?? []).join(', '),
			status: detail.stroll.activeStatus,
			publicity: detail.stroll.publicityFlag,
			imageUrls: detail.stroll.mediaUrls?.imageUrls ?? [],
			videoUrls: detail.stroll.mediaUrls?.videoUrls ?? []
		};
		this.stages = detail.stages
			.slice()
			.sort((left, right) => left.orderIndex - right.orderIndex)
			.map((stage) => this.toEditableStage(stage));
		this.selectedStageId = this.stages[0]?.id ?? null;
		this.loading.set(false);
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
		return { name: '', description: '', labelsText: '', status: 'draft', publicity: 'private', imageUrls: [], videoUrls: [] };
	}
}
