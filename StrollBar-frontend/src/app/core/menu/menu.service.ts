import { Injectable, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { BehaviorSubject, Observable } from 'rxjs';

export interface MenuOption {
  name: string;
  icon: string;
  link: string;
}

@Injectable({
  providedIn: 'root'
})
export class MenuService {

  private optionsSubject: BehaviorSubject<MenuOption[]>;
  public menuOptions$: Observable<MenuOption[]>;

  constructor(
    private http: HttpClient
  ) {
    this.optionsSubject = new BehaviorSubject<MenuOption[]>([
      {
        name: 'MENU.HOME',
        icon: 'home',
        link: 'home'
      },
      {
        name: 'MENU.HOME',
        icon: 'home',
        link: 'home'
      }
    ]);

    this.menuOptions$ = this.optionsSubject.asObservable();

    this.initMenu();
  }

  private initMenu(): void {
    const menuConfigLocation = `assets/config/menu-config.json`;
    this.http.get(menuConfigLocation).subscribe((result: MenuOption[]) => {
      this.optionsSubject.next(result);
    }, (error) => {
      console.log('Can not find menu configuration. The default remains in use.');
    });
  }

}
