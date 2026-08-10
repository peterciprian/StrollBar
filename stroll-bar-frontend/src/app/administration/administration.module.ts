import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdministrationRoutingModule } from './administration-routing.module';
import { AdministrationComponent } from './administration.component';
import { EditStrollComponent } from './components/edit-stroll/edit-stroll.component';
import { EditStageComponent } from './components/edit-stage/edit-stage.component';


@NgModule({
  imports: [
    CommonModule,
    AdministrationRoutingModule,
    AdministrationComponent,
    EditStrollComponent,
    EditStageComponent
  ]
})
export class AdministrationModule { }
