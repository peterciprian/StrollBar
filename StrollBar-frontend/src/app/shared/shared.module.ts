import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MaterialModule } from './material/material.module';
import { StrollCardComponent } from './components/stroll-card/stroll-card.component';
import { SmallStrollCardComponent } from './components/small-stroll-card/small-stroll-card.component';
import { ResultListComponent } from './components/result-list/result-list.component';

@NgModule({
  declarations: [StrollCardComponent, SmallStrollCardComponent, ResultListComponent],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    MaterialModule
  ],
  exports: [
    FormsModule,
    HttpClientModule,
    MaterialModule,
  ]
})
export class SharedModule { }
