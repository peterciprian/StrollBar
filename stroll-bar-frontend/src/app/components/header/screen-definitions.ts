export type ScreenId = 'tour-browser' | 'admin-tour-list' | 'creator-strolls' | 'adventure' | 'user-dashboard';

export interface ScreenDef {
	id: ScreenId;
	commands: string[];
	labelKey: string;
}

export const SCREEN_DEFS: ScreenDef[] = [
	{ id: 'tour-browser', commands: ['/', 'explore'], labelKey: 'SCREENS.TOUR_BROWSER_TAB' },
	{ id: 'admin-tour-list', commands: ['/', 'admin-tour-list'], labelKey: 'SCREENS.ADMIN_TOUR_LIST_TAB' },
	{ id: 'creator-strolls', commands: ['/', 'creator', 'strolls'], labelKey: 'SCREENS.ADMIN_STATION_EDITOR_TAB' },
	{ id: 'adventure', commands: ['/', 'adventure', 'demo-adventure'], labelKey: 'SCREENS.ADVENTURE_TAB' },
	{ id: 'user-dashboard', commands: ['/', 'user-dashboard'], labelKey: 'SCREENS.USER_DASHBOARD_TAB' }
];
