import { Output, EventEmitter, Component, isDevMode } from '@angular/core';

import { Observable } from 'rxjs';
import { Language, LanguageService } from 'src/app/core/services/language.service';



@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styles: [
  ]
})
export class HeaderComponent {

  @Output() public clickSidenavButton: EventEmitter<any> = new EventEmitter();

  public defaultLang: string;

  constructor(
    private languageService: LanguageService
  ) {
    this.defaultLang = languageService.defaultLang;
  }

  public openSidenav(): void {
    this.clickSidenavButton.emit(null);
  }

  public get languages(): Observable<Language[]> {
    return this.languageService.languages$;
  }

  public onChangeLanguage(lang): void {
    this.languageService.changeLanguage(lang);
  }

  public get isDevMode(): boolean {
    return isDevMode();
  }
}
