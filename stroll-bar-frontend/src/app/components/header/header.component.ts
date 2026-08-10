import { Component, EventEmitter, Output, Signal, isDevMode, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../core/services/language.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [],
  templateUrl: './header.component.html',
  styles: []
})
export class HeaderComponent {

  @Output() public clickSidenavButton = new EventEmitter<void>();

  protected readonly languageService = inject(LanguageService);
  private readonly translateService = inject(TranslateService);

  protected readonly translatedLanguages = this.languageService.languages.map(lang => ({
    code: lang.code,
    label: this.translateService.translate(lang.name) as Signal<string>
  }));

  public openSidenav(): void {
    this.clickSidenavButton.emit();
  }

  public onChangeLanguage(code: string): void {
    this.languageService.changeLanguage(code);
  }

  public get isDevMode(): boolean {
    return isDevMode();
  }
}
