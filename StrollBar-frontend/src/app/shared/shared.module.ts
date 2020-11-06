import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MaterialModule } from './material/material.module';
import { ExternalUrlDirective } from './external-url/external-url.directive';

@NgModule({
  declarations: [ExternalUrlDirective],
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
    ExternalUrlDirective
  ]
})
export class SharedModule { }
