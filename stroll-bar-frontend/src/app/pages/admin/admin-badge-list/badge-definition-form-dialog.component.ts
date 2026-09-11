import { Component, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';

import { BADGE_METRICS, BADGE_OPERATORS, BadgeDefinition, BadgeMetric, BadgeOperator, BadgeRuleCondition, StrollCategory } from '../../../core/api/models';

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
		CommonModule,
		FormsModule,
		MatDialogModule,
		MatButtonModule,
		MatCheckboxModule,
		MatFormFieldModule,
		MatIconModule,
		MatInputModule,
		MatSelectModule,
		TranslatePipe
	],
	templateUrl: './badge-definition-form-dialog.component.html',
	styleUrls: ['./badge-definition-form-dialog.component.scss']
})
export class BadgeDefinitionFormDialogComponent {
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
	protected formError = '';

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
		this.rules.set((definition?.rules ?? [{ metric: 'completedStrollsCount', operator: 'gte', value: 1 }]).map((rule) => ({
			metric: rule.metric,
			operator: rule.operator,
			value: String(rule.value)
		})));
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
		this.formError = '';

		if (!this.code.trim() || !/^[A-Z0-9_]+$/.test(this.code.trim())) {
			this.formError = 'SCREENS.ADMIN_BADGE_LIST.FORM_CODE_ERROR';
			return;
		}
		if (!this.icon.trim() || !this.title.trim() || !this.description.trim()) {
			this.formError = 'SCREENS.ADMIN_BADGE_LIST.FORM_REQUIRED_ERROR';
			return;
		}
		if (!this.rules().length) {
			this.formError = 'SCREENS.ADMIN_BADGE_LIST.FORM_RULES_ERROR';
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
