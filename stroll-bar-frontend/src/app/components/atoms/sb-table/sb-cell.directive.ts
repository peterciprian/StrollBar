import { Directive, TemplateRef, inject, input } from '@angular/core';

/** Marks a template that renders a custom cell for a column: `<ng-template sbCell="name" let-row>`. */
@Directive({
	selector: '[sbCell]',
	standalone: true
})
export class SbCellDirective {
	readonly sbCell = input.required<string>();
	readonly template = inject<TemplateRef<{ $implicit: unknown; index: number }>>(TemplateRef);
}
