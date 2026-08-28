export type ScreenId = 'tour-browser' | 'admin-tour-list' | 'creator-strolls' | 'adventure' | 'user-dashboard';

export interface ScreenDef {
	id: ScreenId;
	commands: string[];
	labelKey: string;
	visibleWithoutLogin: boolean;
}

export const SCREEN_DEFS: ScreenDef[] = [
	{ id: 'tour-browser', commands: ['/', 'explore'], labelKey: 'SCREENS.TOUR_BROWSER_TAB', visibleWithoutLogin: true },
	{ id: 'admin-tour-list', commands: ['/', 'admin-tour-list'], labelKey: 'SCREENS.ADMIN_TOUR_LIST_TAB', visibleWithoutLogin: false },
	{ id: 'creator-strolls', commands: ['/', 'creator', 'strolls', 'new'], labelKey: 'SCREENS.ADMIN_STATION_EDITOR_TAB', visibleWithoutLogin: false },
	{ id: 'adventure', commands: ['/', 'adventure', 'demo-adventure'], labelKey: 'SCREENS.ADVENTURE_TAB', visibleWithoutLogin: false },
	{ id: 'user-dashboard', commands: ['/', 'user-dashboard'], labelKey: 'SCREENS.USER_DASHBOARD_TAB', visibleWithoutLogin: false }
];
