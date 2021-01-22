import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StrollsRoutingModule } from './strolls-routing.module';
import { StrollsComponent } from './strolls.component';


@NgModule({
  declarations: [StrollsComponent],
  imports: [
    CommonModule,
    StrollsRoutingModule
  ]
})
export class StrollsModule { }
