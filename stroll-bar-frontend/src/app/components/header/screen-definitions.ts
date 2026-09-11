export type ScreenId = 'stroll-browser' | 'strolls' | 'creator-strolls' | 'user-dashboard';

export interface ScreenDef {
	id: ScreenId;
	commands: string[];
	labelKey: string;
	visibleWithoutLogin: boolean;
	adminOnly?: boolean;
}

export const SCREEN_DEFS: ScreenDef[] = [
	{ id: 'stroll-browser', commands: ['/', 'explore'], labelKey: 'SCREENS.STROLL_BROWSER_TAB', visibleWithoutLogin: true },
	{
		id: 'strolls',
		commands: ['/', 'strolls'],
		labelKey: 'SCREENS.STROLL_LIST_TAB',
		visibleWithoutLogin: false
	},
	{ id: 'creator-strolls', commands: ['/', 'creator', 'strolls', 'new'], labelKey: 'SCREENS.STATION_EDITOR_TAB', visibleWithoutLogin: false },
	{ id: 'user-dashboard', commands: ['/', 'user-dashboard'], labelKey: 'SCREENS.USER_DASHBOARD_TAB', visibleWithoutLogin: false }
];
