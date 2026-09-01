import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { StrollsFeatureService } from '../../features/strolls/strolls-feature.service';
import { MediaUploadFeatureService } from '../../features/media/media-upload-feature.service';
import { CreateStageRequest, CreateStrollRequest, Stage, StrollActiveStatus, StrollDetailResponse, StrollPublicityFlag } from '../../core/api/models';

interface EditableStage {
	id: string;
	isNew: boolean;
	orderIndex: number;
	name: string;
	address: string;
	latitude: number;
	longitude: number;
	description: string;
	riddleAnswer: string;
	imageUrls: string[];
}

@Component({
	selector: 'app-stroll-editor-page',
	standalone: true,
	imports: [
		CommonModule,
		UpperCasePipe,
		FormsModule,
		DragDropModule,
		MatButtonModule,
		MatIconModule,
		MatFormFieldModule,
		MatInputModule,
		MatSelectModule,
		TranslatePipe
	],
	templateUrl: './stroll-editor-page.component.html',
	styleUrls: ['./stroll-editor-page.component.scss']
})
export class StrollEditorPageComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly strollsFeature = inject(StrollsFeatureService);
	private readonly mediaUpload = inject(MediaUploadFeatureService);

	protected readonly activeStatuses: StrollActiveStatus[] = ['draft', 'published', 'archived'];
	protected readonly publicityFlags: StrollPublicityFlag[] = ['private', 'unlisted', 'public'];

	protected loading = true;
	protected strollId: string | null = null;
	protected isNewStroll = true;

	protected strollName = '';
	protected strollDescription = '';
	protected strollLabelsText = '';
	protected strollStatus: StrollActiveStatus = 'draft';
	protected strollPublicity: StrollPublicityFlag = 'private';
	protected strollImageUrls: string[] = [];

	protected stages: EditableStage[] = [];
	protected selectedStageId: string | null = null;

	protected saving = false;
	protected saved = false;
	protected saveError = false;

	protected uploadingCover = false;
	protected uploadingStageImage = false;
	protected uploadError = false;

	ngOnInit(): void {
		const strollId = this.route.snapshot.paramMap.get('strollId');

		if (!strollId || strollId === 'new') {
			this.initializeBlankStroll();
			return;
		}

		this.strollsFeature.getOwnedDetail(strollId).subscribe({
			next: (detail) => this.applyStrollDetail(detail),
			error: () => this.initializeBlankStroll()
		});
	}

	protected get selectedStage(): EditableStage | null {
		return this.stages.find((stage) => stage.id === this.selectedStageId) ?? null;
	}

	protected get canUploadCoverImage(): boolean {
		return !!this.strollId;
	}

	protected get canUploadStageImage(): boolean {
		return !!this.strollId && !!this.selectedStage && !this.selectedStage.isNew;
	}

	protected selectStage(id: string): void {
		this.selectedStageId = id;
		this.saved = false;
	}

	protected drop(event: CdkDragDrop<EditableStage[]>): void {
		moveItemInArray(this.stages, event.previousIndex, event.currentIndex);
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
			imageUrls: []
		};

		this.stages = [...this.stages, stage];
		this.selectedStageId = stage.id;
	}

	protected deleteStage(stage: EditableStage): void {
		if (stage.isNew || !this.strollId) {
			this.removeStageLocally(stage.id);
			return;
		}

		this.strollsFeature.removeStage(this.strollId, stage.id).subscribe({
			next: () => this.removeStageLocally(stage.id)
		});
	}

	protected onCoverImageSelected(event: Event): void {
		const file = this.takeSelectedFile(event);

		if (!file || !this.strollId) {
			return;
		}

		this.uploadingCover = true;
		this.uploadError = false;
		this.mediaUpload.upload(file, 'stroll', this.strollId).subscribe({
			next: (publicUrl) => {
				this.strollImageUrls = [...this.strollImageUrls, publicUrl];
				this.uploadingCover = false;
			},
			error: () => {
				this.uploadError = true;
				this.uploadingCover = false;
			}
		});
	}

	protected onStageImageSelected(event: Event): void {
		const file = this.takeSelectedFile(event);
		const stage = this.selectedStage;

		if (!file || !stage || stage.isNew) {
			return;
		}

		this.uploadingStageImage = true;
		this.uploadError = false;
		this.mediaUpload.upload(file, 'stage', stage.id).subscribe({
			next: (publicUrl) => {
				stage.imageUrls = [...stage.imageUrls, publicUrl];
				this.uploadingStageImage = false;
			},
			error: () => {
				this.uploadError = true;
				this.uploadingStageImage = false;
			}
		});
	}

	protected async saveChanges(): Promise<void> {
		if (!this.strollName.trim() || !this.strollDescription.trim() || this.saving) {
			return;
		}

		this.saving = true;
		this.saveError = false;
		this.saved = false;

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
			name: this.strollName,
			description: this.strollDescription,
			labels: this.parseLabels(),
			activeStatus: this.strollStatus,
			publicityFlag: this.strollPublicity,
			imageUrls: this.strollImageUrls
		};

		if (this.isNewStroll) {
			const created = await firstValueFrom(this.strollsFeature.create(payload));
			this.strollId = created.id;
			this.isNewStroll = false;
			this.router.navigate(['/creator/strolls', created.id], { replaceUrl: true });
			return;
		}

		await firstValueFrom(this.strollsFeature.update(this.strollId!, payload));
	}

	private async saveStages(): Promise<void> {
		if (!this.strollId) {
			return;
		}

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

		if (this.stages.length) {
			await firstValueFrom(
				this.strollsFeature.reorderStages(this.strollId, {
					items: this.stages.map((stage) => ({ stageId: stage.id, orderIndex: stage.orderIndex }))
				})
			);
		}
	}

	private applyStrollDetail(detail: StrollDetailResponse): void {
		this.strollId = detail.stroll.id;
		this.isNewStroll = false;
		this.strollName = detail.stroll.name;
		this.strollDescription = detail.stroll.description;
		this.strollLabelsText = (detail.stroll.labels ?? []).join(', ');
		this.strollStatus = detail.stroll.activeStatus;
		this.strollPublicity = detail.stroll.publicityFlag;
		this.strollImageUrls = detail.stroll.mediaUrls?.imageUrls ?? [];
		this.stages = detail.stages
			.slice()
			.sort((a, b) => a.orderIndex - b.orderIndex)
			.map((stage) => this.toEditableStage(stage));
		this.selectedStageId = this.stages[0]?.id ?? null;
		this.loading = false;
	}

	private initializeBlankStroll(): void {
		this.strollId = null;
		this.isNewStroll = true;
		this.strollName = '';
		this.strollDescription = '';
		this.strollLabelsText = '';
		this.strollStatus = 'draft';
		this.strollPublicity = 'private';
		this.strollImageUrls = [];
		this.stages = [];
		this.selectedStageId = null;
		this.loading = false;
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
			// The backend never returns the stored answer; leave blank to keep it unchanged unless edited.
			riddleAnswer: '',
			imageUrls: stage.imageUrls ?? []
		};
	}

	private removeStageLocally(id: string): void {
		this.stages = this.stages.filter((stage) => stage.id !== id);

		if (this.selectedStageId === id) {
			this.selectedStageId = this.stages[0]?.id ?? null;
		}
	}

	private parseLabels(): string[] {
		return this.strollLabelsText
			.split(',')
			.map((label) => label.trim())
			.filter(Boolean);
	}

	private takeSelectedFile(event: Event): File | null {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0] ?? null;
		input.value = '';
		return file;
	}
}
