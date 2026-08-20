import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { LoginPageComponent } from './pages/auth/login-page.component';
import { RegisterPageComponent } from './pages/auth/register-page.component';
import { StrollDetailPageComponent } from './pages/explore/stroll-detail-page.component';
import { StrollEditorPageComponent } from './pages/creator/stroll-editor-page.component';
import { AdventureSessionPageComponent } from './pages/progress/adventure-session-page.component';
import { CreatorProfilePageComponent } from './pages/profile/creator-profile-page.component';
import { TourBrowserScreenComponent } from './pages/screens/views/tour-browser/tour-browser.component';
import { ActiveAdventureScreenComponent } from './pages/screens/views/active-adventure/active-adventure.component';
import { AdminTourListScreenComponent } from './pages/screens/views/admin-tour-list/admin-tour-list.component';
import { UserDashboardScreenComponent } from './pages/screens/views/user-dashboard/user-dashboard.component';
import { SettingsPageComponent } from './pages/settings/settings.component';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', component: HomeComponent },
	{ path: 'auth/login', component: LoginPageComponent },
	{ path: 'auth/register', component: RegisterPageComponent },
	{ path: 'explore', component: TourBrowserScreenComponent },
	{ path: 'adventure/:adventureId', component: ActiveAdventureScreenComponent },
	{ path: 'admin-tour-list', component: AdminTourListScreenComponent },
	{ path: 'user-dashboard', component: UserDashboardScreenComponent },
	{ path: 'strolls/:strollId', component: StrollDetailPageComponent },
	{ path: 'creator/strolls', component: StrollEditorPageComponent },
	{ path: 'creator/strolls/new', component: StrollEditorPageComponent },
	{ path: 'creator/strolls/:strollId/edit', component: StrollEditorPageComponent },
	{ path: 'adventures/:adventureId', component: AdventureSessionPageComponent },
	{ path: 'users/:userId', component: CreatorProfilePageComponent },
	{ path: 'settings', component: SettingsPageComponent },
	{ path: '**', redirectTo: 'explore' }
];
