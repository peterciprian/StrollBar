import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { BadgeDefinition, CreateBadgeDefinitionRequest } from '../../../core/api/models';
import { BadgesAdminFeatureService } from '../../../features/badges/badges-admin-feature.service';
import { ConfirmDeleteDialogComponent } from '../../../shared/confirm-delete-dialog.component';
import { BadgeDefinitionFormDialogComponent, BadgeDefinitionFormDialogData } from './badge-definition-form-dialog.component';

@Component({
	selector: 'app-admin-badge-list-screen',
	standalone: true,
	imports: [CommonModule, MatButtonModule, MatChipsModule, MatIconModule, MatSlideToggleModule, MatTableModule, MatTooltipModule, TranslatePipe],
	templateUrl: './admin-badge-list.component.html',
	styleUrls: ['./admin-badge-list.component.scss']
})
export class AdminBadgeListScreenComponent implements OnInit {
	private readonly badgesAdminFeature = inject(BadgesAdminFeatureService);
	private readonly dialog = inject(MatDialog);
	private readonly destroyRef = inject(DestroyRef);

	protected readonly displayedColumns = ['badge', 'rules', 'active', 'actions'];
	protected readonly definitions = signal<BadgeDefinition[]>([]);
	protected readonly loading = signal(true);
	protected readonly loadError = signal(false);

	ngOnInit(): void {
		this.loadDefinitions();
	}

	private loadDefinitions(): void {
		this.loading.set(true);
		this.badgesAdminFeature
			.list()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (definitions) => {
					this.definitions.set(definitions);
					this.loading.set(false);
				},
				error: () => {
					this.loadError.set(true);
					this.loading.set(false);
				}
			});
	}

	protected ruleSummary(definition: BadgeDefinition): string {
		return definition.rules.map((rule) => `${rule.metric} ${rule.operator} ${rule.value}`).join(' AND ');
	}

	protected async openCreateDialog(): Promise<void> {
		await this.openFormDialog(null);
	}

	protected async openEditDialog(definition: BadgeDefinition): Promise<void> {
		await this.openFormDialog(definition);
	}

	private async openFormDialog(definition: BadgeDefinition | null): Promise<void> {
		const result = await firstValueFrom(
			this.dialog
				.open<BadgeDefinitionFormDialogComponent, BadgeDefinitionFormDialogData, CreateBadgeDefinitionRequest | null>(
					BadgeDefinitionFormDialogComponent,
					{
						data: { definition },
						maxWidth: 'calc(100vw - 32px)',
						width: '600px'
					}
				)
				.afterClosed()
		);
		if (!result) return;

		const request = definition
			? this.badgesAdminFeature.update(definition.id, result)
			: this.badgesAdminFeature.create(result);

		request.subscribe({
			next: () => this.loadDefinitions(),
			error: () => this.loadError.set(true)
		});
	}

	protected toggleActive(definition: BadgeDefinition): void {
		this.badgesAdminFeature.update(definition.id, { active: !definition.active }).subscribe({
			next: (updated) => this.definitions.update((defs) => defs.map((def) => (def.id === updated.id ? updated : def))),
			error: () => this.loadError.set(true)
		});
	}

	protected async deleteDefinition(definition: BadgeDefinition): Promise<void> {
		const confirmed = await firstValueFrom(
			this.dialog
				.open(ConfirmDeleteDialogComponent, {
					data: {
						titleKey: 'SCREENS.ADMIN_BADGE_LIST.DELETE_CONFIRM_TITLE',
						messageKey: 'SCREENS.ADMIN_BADGE_LIST.DELETE_CONFIRM_MESSAGE',
						itemName: definition.title
					},
					maxWidth: 'calc(100vw - 32px)',
					width: '420px'
				})
				.afterClosed()
		);
		if (!confirmed) return;

		this.badgesAdminFeature.remove(definition.id).subscribe({
			next: () => this.definitions.update((defs) => defs.filter((def) => def.id !== definition.id)),
			error: () => this.loadError.set(true)
		});
	}
}
