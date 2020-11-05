import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'not-found',
  templateUrl: './not-found.component.html'
})
export class NotFoundComponent implements OnInit {

  constructor(
    private location: Location
  ) { }

  public ngOnInit(): void {
    // EMPTY NOW
  }

  public navigateBack(): void {
    this.location.back();
  }

}
