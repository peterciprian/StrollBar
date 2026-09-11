export type SettingsSectionId = 'profile' | 'achievements' | 'analytics' | 'reviews' | 'settings' | 'user-list' | 'adventures' | 'badges' | 'issues';

export interface SettingsSectionDef {
	id: SettingsSectionId;
	labelKey: string;
	icon: string;
	kind: 'settings' | 'admin';
	route: string[];
}

export const SETTINGS_SECTIONS: SettingsSectionDef[] = [
	{ id: 'profile', labelKey: 'SETTINGS.SECTION_PROFILE', icon: 'account_circle', kind: 'settings', route: ['/settings/profile'] },
	{ id: 'achievements', labelKey: 'SETTINGS.SECTION_ACHIEVEMENTS', icon: 'emoji_events', kind: 'settings', route: ['/settings/achievements'] },
	{ id: 'analytics', labelKey: 'SETTINGS.SECTION_ANALYTICS', icon: 'insights', kind: 'settings', route: ['/settings/analytics'] },
	{ id: 'reviews', labelKey: 'SETTINGS.SECTION_REVIEWS', icon: 'rate_review', kind: 'settings', route: ['/settings/reviews'] },
	{ id: 'settings', labelKey: 'SETTINGS.SECTION_SETTINGS', icon: 'settings', kind: 'settings', route: ['/settings/settings'] },
	{ id: 'user-list', labelKey: 'HEADER.ADMIN_USERS', icon: 'group', kind: 'admin', route: ['/admin/user-list'] },
	{ id: 'adventures', labelKey: 'HEADER.ADMIN_ADVENTURES', icon: 'explore', kind: 'admin', route: ['/admin/adventures'] },
	{ id: 'badges', labelKey: 'HEADER.ADMIN_BADGES', icon: 'emoji_events', kind: 'admin', route: ['/admin/badges'] },
	{ id: 'issues', labelKey: 'HEADER.ADMIN_ISSUES', icon: 'report_problem', kind: 'admin', route: ['/admin/issues'] }
];
