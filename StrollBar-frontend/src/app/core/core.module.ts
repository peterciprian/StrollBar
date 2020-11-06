import { NgModule, Optional, SkipSelf, InjectionToken, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ActivatedRouteSnapshot } from '@angular/router';

import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { NotFoundModule } from './not-found';
import { environment } from 'src/environments/environment';

///////////////////////////////////
// Declare tree-shakeable tokens //
///////////////////////////////////
export const API_ENDPOINT = new InjectionToken<string>('apiEndpoint', {
  providedIn: 'root',
  factory: () => environment.baseApiUrl
});

export const externalUrlProvider = new InjectionToken('externalUrlRedirectResolver');

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient): TranslateHttpLoader {
  return new TranslateHttpLoader(http, '/assets/i18n/');
}

/**
 * Components
 */
const coreComponents: any[] = [
];

/**
 * Services
 */
const coreServices: any[] = [
  {
    provide: externalUrlProvider,
    useValue: (route: ActivatedRouteSnapshot) => {
      const externalUrl = route.paramMap.get('externalUrl');
      window.open(externalUrl, '_self');
    }
  }
];

/**
 * Directives
 */
const coreDirectives: any[] = [
];

/**
 * Pipes
 */
const corePipes: any[] = [
];

@NgModule({
  imports: [
    CommonModule,
    NotFoundModule,
    HttpClientModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      },
      defaultLanguage: 'hu'
    })
  ],
  exports: [coreComponents, TranslateModule],
  declarations: [corePipes, coreDirectives, coreComponents],
  providers: [coreServices]
})
export class CoreModule {

  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    if (parentModule) {
      throw new Error(
        'CoreModule is already loaded. Import it in the AppModule only');
    }
  }

  static forRoot(): ModuleWithProviders<CoreModule> {
    return {
      ngModule: CoreModule,
      providers: [
        coreServices
      ]
    };
  }

}
