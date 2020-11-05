import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { TranslateService } from '@ngx-translate/core';
import { Observable, BehaviorSubject } from 'rxjs';

export interface Language {
  name: string;
  code: string;
}

@Injectable({
  providedIn: 'root'
})
export class LanguageService {

  private languagesSubject: BehaviorSubject<Language[]>;
  public languages$: Observable<Language[]>;
  public defaultLang: string;

  constructor(
    private http: HttpClient,
    private translate: TranslateService
  ) {
    this.languagesSubject = new BehaviorSubject<Language[]>([
      {
        name: 'LANGUAGE.HU',
        code: 'hu'
      },
      {
        name: 'LANGUAGE.EN',
        code: 'en'
      }
    ]);

    this.languages$ = this.languagesSubject.asObservable();
    this.defaultLang = this.translate.getDefaultLang();
  }

  public changeLanguage(lang): void {
    this.translate.use(lang);
  }
}
