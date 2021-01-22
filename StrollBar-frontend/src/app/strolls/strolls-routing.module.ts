import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { StrollsComponent } from './strolls.component';

const routes: Routes = [{ path: '', component: StrollsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StrollsRoutingModule { }
