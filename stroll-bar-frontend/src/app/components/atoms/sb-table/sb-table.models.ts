import { SbAlign } from '../atom.types';

export interface SbTableColumn<T = object> {
	/** Matches both the data key and the `sbCell` template name. */
	key: string;
	/** Already-translated header text. */
	header: string;
	/** Derives the cell text when no `sbCell` template is supplied. */
	cell?: (row: T, index: number) => string;
	align?: SbAlign;
	width?: string;
	sortable?: boolean;
	/** Hides the column below the given breakpoint so tables stay readable on phones. */
	hideBelow?: 'sm' | 'md';
}

export interface SbTableSort {
	key: string;
	direction: 'asc' | 'desc';
}
