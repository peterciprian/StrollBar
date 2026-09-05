export type ScreenId = 'stroll-browser' | 'admin-stroll-list' | 'admin-user-list' | 'creator-strolls' | 'user-dashboard';

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
		id: 'admin-stroll-list',
		commands: ['/', 'admin', 'stroll-list'],
		labelKey: 'SCREENS.ADMIN_STROLL_LIST_TAB',
		visibleWithoutLogin: false,
		adminOnly: true
	},
	{
		id: 'admin-user-list',
		commands: ['/', 'admin', 'user-list'],
		labelKey: 'SCREENS.ADMIN_USER_LIST_TAB',
		visibleWithoutLogin: false,
		adminOnly: true
	},
	{ id: 'creator-strolls', commands: ['/', 'creator', 'strolls', 'new'], labelKey: 'SCREENS.STATION_EDITOR_TAB', visibleWithoutLogin: false },
	{ id: 'user-dashboard', commands: ['/', 'user-dashboard'], labelKey: 'SCREENS.USER_DASHBOARD_TAB', visibleWithoutLogin: false }
];
