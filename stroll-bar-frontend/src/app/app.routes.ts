import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { LoginPageComponent } from './pages/auth/login-page.component';
import { RegisterPageComponent } from './pages/auth/register-page.component';
import { SocialCallbackPageComponent } from './pages/auth/social-callback-page.component';
import { VerifyEmailPageComponent } from './pages/auth/verify-email-page.component';
import { CreatorProfilePageComponent } from './pages/profile/creator-profile-page.component';
import { StrollBrowserScreenComponent } from './pages/explore/stroll-browser.component';
import { AdventureScreenComponent } from './pages/progress/adventure.component';
import { AdminStrollListScreenComponent } from './pages/admin/admin-stroll-list/admin-stroll-list.component';
import { AdminUserListScreenComponent } from './pages/admin/admin-user-list/admin-user-list.component';
import { UserDashboardScreenComponent } from './pages/user/user-dashboard/user-dashboard.component';
import { SettingsPageComponent } from './pages/settings/settings.component';
import { SettingsProfileComponent } from './pages/settings/profile/settings-profile.component';
import { SettingsAchievementsComponent } from './pages/settings/achievements/settings-achievements.component';
import { SettingsAnalyticsComponent } from './pages/settings/analytics/settings-analytics.component';
import { SettingsPreferencesComponent } from './pages/settings/preferences/settings-preferences.component';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { LegalPageComponent } from './pages/legal/legal-page.component';
import { StrollEditorPageComponent } from './pages/creator/stroll-editor-page.component';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', component: HomeComponent },
	{ path: 'auth/login', component: LoginPageComponent },
	{ path: 'auth/register', component: RegisterPageComponent },
	{ path: 'auth/social/callback', component: SocialCallbackPageComponent },
	{ path: 'auth/verify-email', component: VerifyEmailPageComponent },
	{ path: 'explore', component: StrollBrowserScreenComponent },
	{ path: 'impressum', component: LegalPageComponent, data: { document: 'imprint' } },
	{ path: 'privacy-policy', component: LegalPageComponent, data: { document: 'privacy' } },
	{ path: 'terms-of-service', component: LegalPageComponent, data: { document: 'terms' } },
	{ path: 'adventure/:adventureId', component: AdventureScreenComponent, canActivate: [authGuard] },
	{ path: 'admin/stroll-list', component: AdminStrollListScreenComponent, canActivate: [adminGuard] },
	{ path: 'admin/user-list', component: AdminUserListScreenComponent, canActivate: [adminGuard] },
	{ path: 'user-dashboard', component: UserDashboardScreenComponent, canActivate: [authGuard] },
	{ path: 'creator/strolls/new', component: StrollEditorPageComponent, canActivate: [authGuard] },
	{ path: 'creator/strolls/:strollId', component: StrollEditorPageComponent, canActivate: [authGuard] },
	{ path: 'users/:userId', component: CreatorProfilePageComponent, canActivate: [authGuard] },
	{
		path: 'settings',
		component: SettingsPageComponent,
		canActivate: [authGuard],
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
