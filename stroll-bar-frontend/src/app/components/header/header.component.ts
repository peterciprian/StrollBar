import { Output, EventEmitter, Component, isDevMode, inject } from '@angular/core';

import { Observable } from 'rxjs';
import { Language, LanguageService } from '../../core/services/language.service';



@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  styles: [
  ]
})
export class HeaderComponent {

  @Output() public clickSidenavButton: EventEmitter<any> = new EventEmitter();

  public defaultLang: string;

  private languageService = inject(LanguageService);

  constructor() {
    this.defaultLang = this.languageService.defaultLang;
  }

  public openSidenav(): void {
    this.clickSidenavButton.emit(null);
  }

  public get languages(): Observable<Language[]> {
    return this.languageService.languages$;
  }

  public onChangeLanguage(lang: string): void {
    this.languageService.changeLanguage(lang);
  }

  public get isDevMode(): boolean {
    return isDevMode();
  }
}
