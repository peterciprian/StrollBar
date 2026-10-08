import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { SbButtonComponent } from '../../../components/atoms/sb-button/sb-button.component';
import { SbIconComponent } from '../../../components/atoms/sb-icon/sb-icon.component';
import { SbIconButtonComponent } from '../../../components/atoms/sb-icon-button/sb-icon-button.component';
import { SbPageHeaderComponent } from '../../../components/atoms/sb-page-header/sb-page-header.component';
import { SbCellDirective } from '../../../components/atoms/sb-table/sb-cell.directive';
import { SbTableComponent } from '../../../components/atoms/sb-table/sb-table.component';
import { SbTableColumn } from '../../../components/atoms/sb-table/sb-table.models';
import { BadgeDefinition, CreateBadgeDefinitionRequest } from '../../../core/api/models';
import { BadgesAdminFeatureService } from '../../../features/badges/badges-admin-feature.service';
import { ConfirmDeleteDialogComponent } from '../../../shared/confirm-delete-dialog.component';
import { BadgeDefinitionFormDialogComponent, BadgeDefinitionFormDialogData } from './badge-definition-form-dialog.component';

type BadgeRow = BadgeDefinition & Record<string, unknown>;

@Component({
	selector: 'app-admin-badge-list-screen',
	standalone: true,
	imports: [
		MatSlideToggleModule,
		TranslatePipe,
		SbButtonComponent,
		SbCellDirective,
		SbIconButtonComponent,
		SbIconComponent,
		SbPageHeaderComponent,
		SbTableComponent
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './admin-badge-list.component.html',
	styleUrl: './admin-badge-list.component.scss'
})
export class AdminBadgeListScreenComponent implements OnInit {
	private readonly badgesAdminFeature = inject(BadgesAdminFeatureService);
	private readonly dialog = inject(MatDialog);
	private readonly destroyRef = inject(DestroyRef);
	private readonly translate = inject(TranslateService);

	protected readonly displayedColumns = ['badge', 'rules', 'active', 'actions'];
	protected readonly definitions = signal<BadgeDefinition[]>([]);
	protected readonly loading = signal(true);
	protected readonly loadError = signal(false);

	protected readonly rows = computed(() => this.definitions() as BadgeRow[]);

	protected readonly columns = computed<SbTableColumn<BadgeRow>[]>(() => {
		this.translate.currentLang();
		return [
			{ key: 'badge', header: this.translate.instant('SCREENS.ADMIN_BADGE_LIST.COL_BADGE') },
			{ key: 'rules', header: this.translate.instant('SCREENS.ADMIN_BADGE_LIST.COL_RULES'), hideBelow: 'md' },
			{ key: 'active', header: this.translate.instant('SCREENS.ADMIN_BADGE_LIST.COL_ACTIVE'), align: 'center' },
			{ key: 'actions', header: this.translate.instant('SCREENS.ADMIN_BADGE_LIST.COL_ACTIONS'), align: 'end' }
		];
	});

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

		const request = definition ? this.badgesAdminFeature.update(definition.id, result) : this.badgesAdminFeature.create(result);

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
