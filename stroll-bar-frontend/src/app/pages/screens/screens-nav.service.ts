import { Injectable, signal } from '@angular/core';

export type ScreenId = 'tour-browser' | 'active-adventure' | 'admin-tour-list' | 'admin-station-editor' | 'user-dashboard';

export interface ScreenDef {
	id: ScreenId;
	labelKey: string;
}

export const SCREEN_DEFS: ScreenDef[] = [
	{ id: 'tour-browser', labelKey: 'SCREENS.TOUR_BROWSER_TAB' },
	{ id: 'active-adventure', labelKey: 'SCREENS.ACTIVE_ADVENTURE_TAB' },
	{ id: 'admin-tour-list', labelKey: 'SCREENS.ADMIN_TOUR_LIST_TAB' },
	{ id: 'admin-station-editor', labelKey: 'SCREENS.ADMIN_STATION_EDITOR_TAB' },
	{ id: 'user-dashboard', labelKey: 'SCREENS.USER_DASHBOARD_TAB' }
];

// Shared between the header nav and the screens page so the tab strip can live in the header.
@Injectable({ providedIn: 'root' })
export class ScreensNavService {
	readonly activeScreen = signal<ScreenId>('tour-browser');

	setActiveScreen(screen: ScreenId): void {
		this.activeScreen.set(screen);
	}
}
