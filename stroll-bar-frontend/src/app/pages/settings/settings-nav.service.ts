export type SettingsSectionId = 'profile' | 'achievements' | 'analytics' | 'settings';

export interface SettingsSectionDef {
	id: SettingsSectionId;
	labelKey: string;
	icon: string;
}

export const SETTINGS_SECTIONS: SettingsSectionDef[] = [
	{ id: 'profile', labelKey: 'SETTINGS.SECTION_PROFILE', icon: 'account_circle' },
	{ id: 'achievements', labelKey: 'SETTINGS.SECTION_ACHIEVEMENTS', icon: 'emoji_events' },
	{ id: 'analytics', labelKey: 'SETTINGS.SECTION_ANALYTICS', icon: 'insights' },
	{ id: 'settings', labelKey: 'SETTINGS.SECTION_SETTINGS', icon: 'settings' }
];
