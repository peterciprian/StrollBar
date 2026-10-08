import { ChangeDetectionStrategy, Component, Inject, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { SbButtonComponent } from '../../../components/atoms/sb-button/sb-button.component';
import { SbAlertComponent } from '../../../components/atoms/sb-alert/sb-alert.component';
import { SbCheckboxComponent } from '../../../components/atoms/sb-checkbox/sb-checkbox.component';
import { SbDialogShellComponent } from '../../../components/atoms/sb-dialog-shell/sb-dialog-shell.component';
import { SbIconButtonComponent } from '../../../components/atoms/sb-icon-button/sb-icon-button.component';
import { SbInputComponent } from '../../../components/atoms/sb-input/sb-input.component';
import { SbSelectComponent, SbSelectOption } from '../../../components/atoms/sb-select/sb-select.component';
import { SbTextareaComponent } from '../../../components/atoms/sb-textarea/sb-textarea.component';
import {
	BADGE_METRICS,
	BADGE_OPERATORS,
	BadgeDefinition,
	BadgeMetric,
	BadgeOperator,
	BadgeRuleCondition,
	StrollCategory
} from '../../../core/api/models';

export interface BadgeDefinitionFormDialogData {
	definition: BadgeDefinition | null;
}

interface RuleRow {
	metric: BadgeMetric;
	operator: BadgeOperator;
	value: string;
}

@Component({
	selector: 'app-badge-definition-form-dialog',
	standalone: true,
	imports: [
		FormsModule,
		TranslatePipe,
		SbAlertComponent,
		SbButtonComponent,
		SbCheckboxComponent,
		SbDialogShellComponent,
		SbIconButtonComponent,
		SbInputComponent,
		SbSelectComponent,
		SbTextareaComponent
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './badge-definition-form-dialog.component.html',
	styleUrl: './badge-definition-form-dialog.component.scss'
})
export class BadgeDefinitionFormDialogComponent {
	private readonly translate = inject(TranslateService);

	protected readonly metrics = BADGE_METRICS;
	protected readonly operators = BADGE_OPERATORS;
	protected readonly categories = Object.values(StrollCategory);
	protected readonly isEdit: boolean;

	protected code: string;
	protected icon: string;
	protected title: string;
	protected description: string;
	protected active: boolean;
	protected readonly rules = signal<RuleRow[]>([]);
	protected readonly formError = signal('');

	protected readonly metricOptions = computed<SbSelectOption<BadgeMetric>[]>(() =>
		this.metrics.map((metric) => ({ value: metric, label: this.translate.instant(`SCREENS.ADMIN_BADGE_LIST.METRIC_${metric}`) }))
	);
	protected readonly operatorOptions = computed<SbSelectOption<BadgeOperator>[]>(() =>
		this.operators.map((operator) => ({ value: operator, label: this.translate.instant(`SCREENS.ADMIN_BADGE_LIST.OPERATOR_${operator}`) }))
	);
	protected readonly categoryOptions = computed<SbSelectOption<string>[]>(() =>
		this.categories.map((category) => ({ value: category, label: category }))
	);

	constructor(
		private readonly dialogRef: MatDialogRef<BadgeDefinitionFormDialogComponent>,
		@Inject(MAT_DIALOG_DATA) data: BadgeDefinitionFormDialogData
	) {
		const definition = data.definition;
		this.isEdit = !!definition;
		this.code = definition?.code ?? '';
		this.icon = definition?.icon ?? '';
		this.title = definition?.title ?? '';
		this.description = definition?.description ?? '';
		this.active = definition?.active ?? true;
		this.rules.set(
			(definition?.rules ?? [{ metric: 'completedStrollsCount', operator: 'gte', value: 1 }]).map((rule) => ({
				metric: rule.metric,
				operator: rule.operator,
				value: String(rule.value)
			}))
		);
	}

	protected isCategoryMetric(metric: BadgeMetric): boolean {
		return metric === 'categoryCompleted';
	}

	protected addRule(): void {
		this.rules.update((rules) => [...rules, { metric: 'completedStrollsCount', operator: 'gte', value: '1' }]);
	}

	protected removeRule(index: number): void {
		this.rules.update((rules) => rules.filter((_, ruleIndex) => ruleIndex !== index));
	}

	protected updateRule(index: number, patch: Partial<RuleRow>): void {
		this.rules.update((rules) => rules.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, ...patch } : rule)));
	}

	protected cancel(): void {
		this.dialogRef.close(null);
	}

	protected save(): void {
		this.formError.set('');

		if (!this.code.trim() || !/^[A-Z0-9_]+$/.test(this.code.trim())) {
			this.formError.set('SCREENS.ADMIN_BADGE_LIST.FORM_CODE_ERROR');
			return;
		}
		if (!this.icon.trim() || !this.title.trim() || !this.description.trim()) {
			this.formError.set('SCREENS.ADMIN_BADGE_LIST.FORM_REQUIRED_ERROR');
			return;
		}
		if (!this.rules().length) {
			this.formError.set('SCREENS.ADMIN_BADGE_LIST.FORM_RULES_ERROR');
			return;
		}

		const rules: BadgeRuleCondition[] = this.rules().map((rule) => ({
			metric: rule.metric,
			operator: rule.operator,
			value: this.isCategoryMetric(rule.metric) ? rule.value : Number(rule.value)
		}));

		this.dialogRef.close({
			code: this.code.trim().toUpperCase(),
			icon: this.icon.trim(),
			title: this.title.trim(),
			description: this.description.trim(),
			active: this.active,
			rules
		});
	}
}
