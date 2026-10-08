/** Shared vocabulary for every atom so variants stay consistent across the library. */

export type SbSize = 'sm' | 'md' | 'lg';

export type SbIconSize = SbSize | 'xl' | 'feature';

export type SbTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export type SbButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost' | 'inverse';

export type SbAlign = 'start' | 'center' | 'end';

export type SbLoadState = 'idle' | 'loading' | 'error' | 'empty';
