import { Routes } from '@angular/router';
import { LoginPageComponent } from './pages/auth/login-page.component';
import { RegisterPageComponent } from './pages/auth/register-page.component';
import { StrollFeedPageComponent } from './pages/explore/stroll-feed-page.component';
import { StrollDetailPageComponent } from './pages/explore/stroll-detail-page.component';
import { StrollEditorPageComponent } from './pages/creator/stroll-editor-page.component';
import { AdventureSessionPageComponent } from './pages/progress/adventure-session-page.component';
import { CreatorProfilePageComponent } from './pages/profile/creator-profile-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'explore' },
  { path: 'auth/login', component: LoginPageComponent },
  { path: 'auth/register', component: RegisterPageComponent },
  { path: 'explore', component: StrollFeedPageComponent },
  { path: 'strolls/:strollId', component: StrollDetailPageComponent },
  { path: 'creator/strolls/new', component: StrollEditorPageComponent },
  { path: 'creator/strolls/:strollId/edit', component: StrollEditorPageComponent },
  { path: 'adventures/:adventureId', component: AdventureSessionPageComponent },
  { path: 'users/:userId', component: CreatorProfilePageComponent },
  { path: '**', redirectTo: 'explore' },
];
