import { NotFoundComponent } from './not-found.component';

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Components
 */
const notFoundComponents: any[] = [
  NotFoundComponent
];

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    notFoundComponents
  ]
})
export class NotFoundModule { }
