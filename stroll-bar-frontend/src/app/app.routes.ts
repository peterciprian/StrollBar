import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { LoginPageComponent } from './pages/auth/login-page.component';
import { RegisterPageComponent } from './pages/auth/register-page.component';
import { StrollEditorPageComponent } from './pages/creator/stroll-editor-page.component';
import { CreatorProfilePageComponent } from './pages/profile/creator-profile-page.component';
import { TourBrowserScreenComponent } from './pages/explore/tour-browser.component';
import { AdventureScreenComponent } from './pages/progress/adventure.component';
import { AdminTourListScreenComponent } from './pages/admin/admin-tour-list/admin-tour-list.component';
import { UserDashboardScreenComponent } from './pages/user/user-dashboard/user-dashboard.component';
import { SettingsPageComponent } from './pages/settings/settings.component';
import { SettingsProfileComponent } from './pages/settings/profile/settings-profile.component';
import { SettingsAchievementsComponent } from './pages/settings/achievements/settings-achievements.component';
import { SettingsAnalyticsComponent } from './pages/settings/analytics/settings-analytics.component';
import { SettingsPreferencesComponent } from './pages/settings/preferences/settings-preferences.component';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', component: HomeComponent },
	{ path: 'auth/login', component: LoginPageComponent },
	{ path: 'auth/register', component: RegisterPageComponent },
	{ path: 'explore', component: TourBrowserScreenComponent },
	{ path: 'adventure/:adventureId', component: AdventureScreenComponent },
	{ path: 'admin-tour-list', component: AdminTourListScreenComponent },
	{ path: 'user-dashboard', component: UserDashboardScreenComponent },
	{ path: 'creator/strolls', component: StrollEditorPageComponent },
	{ path: 'creator/strolls/new', component: StrollEditorPageComponent },
	{ path: 'creator/strolls/:strollId/edit', component: StrollEditorPageComponent },
	{ path: 'users/:userId', component: CreatorProfilePageComponent },
	{
		path: 'settings',
		component: SettingsPageComponent,
		children: [
			{ path: '', pathMatch: 'full', redirectTo: 'profile' },
			{ path: 'profile', component: SettingsProfileComponent },
			{ path: 'achievements', component: SettingsAchievementsComponent },
			{ path: 'analytics', component: SettingsAnalyticsComponent },
			{ path: 'settings', component: SettingsPreferencesComponent }
		]
	},
	{ path: '**', redirectTo: 'explore' }
];
