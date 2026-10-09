import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService, TranslateService, TranslationObject } from '@ngx-translate/core';
import { CookieConsentService } from '../../core/services/cookie-consent.service';
import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
	let cookieConsent: { openPreferences: jest.Mock };
	let fixture: ComponentFixture<FooterComponent>;
	let host: HTMLElement;
	let translate: TranslateService;

	beforeEach(() => {
		cookieConsent = { openPreferences: jest.fn() };

		TestBed.configureTestingModule({
			imports: [FooterComponent],
			providers: [
				provideRouter([]),
				provideTranslateService(),
				{ provide: CookieConsentService, useValue: cookieConsent }
			]
		});

		translate = TestBed.inject(TranslateService);
	});

	function render(locale: 'hu' | 'en'): void {
		const translationsPath = resolve(__dirname, `../../../assets/i18n/${locale}.json`);
		const translations = JSON.parse(readFileSync(translationsPath, 'utf8')) as TranslationObject;
		translate.setTranslation(locale, translations);
		translate.use(locale);

		fixture = TestBed.createComponent(FooterComponent);
		fixture.detectChanges();
		host = fixture.nativeElement as HTMLElement;
	}

	it.each([
		['hu', 'Nézd meg, milyen idő lesz, mielőtt sétálni indulsz'],
		['en', 'Check what the weather will be like before you head out for a walk']
	] as const)('renders the weather link in %s with safe external-link attributes', (locale, expectedText) => {
		render(locale);

		const weatherLink = host.querySelector<HTMLAnchorElement>('.weather-link');

		expect(weatherLink).not.toBeNull();
		expect(weatherLink!.href).toBe('https://weather.strollbar.app/');
		expect(weatherLink!.textContent?.trim()).toBe(expectedText);
		expect(weatherLink!.target).toBe('_blank');
		expect(weatherLink!.rel.split(/\s+/)).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
	});

	it('keeps the weather link separate from the legal navigation and removes the GitHub footer link', () => {
		render('en');

		const legalNavigation = host.querySelector<HTMLElement>('nav.footer-links');
		const weatherLink = host.querySelector<HTMLAnchorElement>('.weather-link');

		expect(legalNavigation).not.toBeNull();
		expect(legalNavigation!.contains(weatherLink)).toBe(false);
		expect(weatherLink!.closest('nav')).toBeNull();
		expect(host.querySelector('.github-btn')).toBeNull();
		expect(host.textContent).not.toContain('GitHub');
	});

	it('opens cookie preferences from the legal navigation', () => {
		render('hu');

		const legalNavigation = host.querySelector<HTMLElement>('nav.footer-links');
		const cookieButton = legalNavigation!.querySelector<HTMLButtonElement>('.cookie-settings-link');

		expect(cookieButton).not.toBeNull();
		cookieButton!.click();

		expect(cookieConsent.openPreferences).toHaveBeenCalledTimes(1);
	});
});
