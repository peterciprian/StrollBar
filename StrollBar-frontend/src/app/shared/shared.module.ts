import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MaterialModule } from './material/material.module';



@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    MaterialModule
  ],
  exports: [
    FormsModule,
    HttpClientModule,
    MaterialModule
  ]
})
export class SharedModule { }
