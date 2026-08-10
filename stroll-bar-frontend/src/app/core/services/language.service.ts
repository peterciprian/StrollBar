import { Injectable, inject, Signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export interface Language {
  name: string;
  code: string;
}

@Injectable({
  providedIn: 'root'
})
export class LanguageService {

  private readonly translate = inject(TranslateService);

  readonly languages: Language[] = [
    { name: 'LANGUAGE.HU', code: 'hu' },
    { name: 'LANGUAGE.EN', code: 'en' }
  ];

  get currentLang(): Signal<string | null> {
    return this.translate.currentLang;
  }

  changeLanguage(code: string): void {
    this.translate.use(code);
  }
}

