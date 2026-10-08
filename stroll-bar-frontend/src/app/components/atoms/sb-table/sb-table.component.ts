import { ChangeDetectionStrategy, Component, computed, contentChildren, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

import { SbLoadState } from '../atom.types';
import { SbIconComponent } from '../sb-icon/sb-icon.component';
import { SbLoadingStateComponent } from '../sb-loading-state/sb-loading-state.component';
import { SbCellDirective } from './sb-cell.directive';
import { SbTableColumn, SbTableSort } from './sb-table.models';

@Component({
	selector: 'sb-table',
	standalone: true,
	imports: [NgTemplateOutlet, SbIconComponent, SbLoadingStateComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'sb-table', '[class.sb-table--cards-on-mobile]': 'cardOnMobile()' },
	templateUrl: './sb-table.component.html',
	styleUrl: './sb-table.component.scss'
})
export class SbTableComponent<T extends object> {
	readonly columns = input.required<readonly SbTableColumn<T>[]>();
	readonly rows = input.required<readonly T[]>();
	readonly caption = input<string | null>(null);
	readonly sort = input<SbTableSort | null>(null);
	readonly loading = input(false);
	readonly error = input(false);
	readonly loadingText = input<string | null>(null);
	readonly errorTitle = input<string>('');
	readonly errorDescription = input<string | null>(null);
	readonly emptyTitle = input<string>('');
	readonly emptyDescription = input<string | null>(null);
	readonly retryLabel = input<string | null>(null);
	readonly rowClickable = input(false);
	/** Stacks each row into a card below the `sm` breakpoint instead of scrolling sideways. */
	readonly cardOnMobile = input(false);

	readonly sortChange = output<SbTableSort>();
	readonly rowClick = output<T>();
	readonly rowDoubleClick = output<T>();
	readonly retried = output<void>();

	private readonly cellTemplates = contentChildren(SbCellDirective);

	protected readonly state = computed<SbLoadState>(() => {
		if (this.loading()) return 'loading';
		if (this.error()) return 'error';
		return this.rows().length === 0 ? 'empty' : 'idle';
	});

	protected templateFor(key: string) {
		return this.cellTemplates().find((entry) => entry.sbCell() === key)?.template ?? null;
	}

	protected cellText(column: SbTableColumn<T>, row: T, index: number): string {
		if (column.cell) return column.cell(row, index);
		const raw = (row as Record<string, unknown>)[column.key];
		return raw === null || raw === undefined ? '' : String(raw);
	}

	protected ariaSort(column: SbTableColumn<T>): 'ascending' | 'descending' | 'none' | null {
		if (!column.sortable) return null;
		const sort = this.sort();
		if (!sort || sort.key !== column.key) return 'none';
		return sort.direction === 'asc' ? 'ascending' : 'descending';
	}

	protected sortIcon(column: SbTableColumn<T>): string {
		const sort = this.sort();
		if (!sort || sort.key !== column.key) return 'unfold_more';
		return sort.direction === 'asc' ? 'arrow_upward' : 'arrow_downward';
	}

	protected toggleSort(column: SbTableColumn<T>): void {
		if (!column.sortable) return;
		const sort = this.sort();
		const direction = sort?.key === column.key && sort.direction === 'asc' ? 'desc' : 'asc';
		this.sortChange.emit({ key: column.key, direction });
	}

	protected onRowClick(row: T): void {
		if (this.rowClickable()) this.rowClick.emit(row);
	}

	protected onRowDoubleClick(row: T, event: MouseEvent): void {
		const target = event.target;
		if (
			target instanceof Element &&
			target.closest(
				'a, button, input, textarea, select, label, summary, audio[controls], video[controls], ' +
					'[contenteditable]:not([contenteditable="false" i]), ' +
					'[role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], ' +
					'[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="option"], [role="tab"], ' +
					'[role="textbox"], [role="searchbox"], [role="combobox"], [role="slider"], [role="spinbutton"]'
			)
		) {
			return;
		}

		this.rowDoubleClick.emit(row);
	}
}
