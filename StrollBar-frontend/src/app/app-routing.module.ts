import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { externalUrlProvider } from './core';
import { NotFoundComponent } from './core/not-found/not-found.component';

const routes: Routes = [
  {
    path: 'externalRedirect',
    resolve: {
      url: externalUrlProvider,
    },
    // We need a component here because we cannot define the route otherwise
    component: NotFoundComponent,
  },
  { path: '**', component: NotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
