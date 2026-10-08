import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { StrollActiveStatus, StrollCategory, StrollPublicityFlag } from '../../core/api/models';
import { EditableStroll } from './creator-editor.models';
import { MediaChange, MediaManagerComponent } from './media-manager.component';
import { SbInputComponent } from '../../components/atoms/sb-input/sb-input.component';
import { SbSelectComponent, SbSelectOption } from '../../components/atoms/sb-select/sb-select.component';
import { SbTextareaComponent } from '../../components/atoms/sb-textarea/sb-textarea.component';

@Component({
	selector: 'app-stroll-details-editor',
	standalone: true,
	imports: [CommonModule, FormsModule, TranslatePipe, MediaManagerComponent, SbInputComponent, SbSelectComponent, SbTextareaComponent],
	templateUrl: './stroll-details-editor.component.html',
	styleUrls: ['./stroll-details-editor.component.scss']
})
export class StrollDetailsEditorComponent {
	private readonly translate = inject(TranslateService);
	@Input({ required: true }) stroll!: EditableStroll;
	@Input() strollId: string | null = null;
	@Input() activeStatuses: StrollActiveStatus[] = [];
	@Input() publicityFlags: StrollPublicityFlag[] = [];
	@Input() categories: StrollCategory[] = [];
	@Output() mediaChange = new EventEmitter<MediaChange>();

	protected readonly currencies = ['HUF', 'EUR', 'USD'];

	protected get statusOptions(): SbSelectOption<StrollActiveStatus>[] {
		return this.activeStatuses.map((status) => ({
			value: status,
			label: this.translate.instant(`SCREENS.ADMIN_STATION_EDITOR.STATUS_${status.toUpperCase()}`)
		}));
	}

	protected get publicityOptions(): SbSelectOption<StrollPublicityFlag>[] {
		return this.publicityFlags.map((flag) => ({
			value: flag,
			label: this.translate.instant(`SCREENS.ADMIN_STATION_EDITOR.PUBLICITY_${flag.toUpperCase()}`)
		}));
	}

	protected get categoryOptions(): SbSelectOption<StrollCategory>[] {
		return this.categories.map((category) => ({
			value: category,
			label: this.translate.instant(`SCREENS.CATEGORY_${category}`)
		}));
	}

	protected get currencyOptions(): SbSelectOption<string>[] {
		return this.currencies.map((currency) => ({ value: currency, label: currency }));
	}
}
