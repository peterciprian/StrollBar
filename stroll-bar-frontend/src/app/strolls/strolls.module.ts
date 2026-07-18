import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StrollsRoutingModule } from './strolls-routing.module';
import { StrollsComponent } from './strolls.component';
import { SearchbarComponent } from './searchbar/searchbar.component';
import { StrollDetailsComponent } from './stroll-details/stroll-details.component';


@NgModule({
  declarations: [StrollsComponent, SearchbarComponent, StrollDetailsComponent],
  imports: [
    CommonModule,
    StrollsRoutingModule
  ]
})
export class StrollsModule { }
