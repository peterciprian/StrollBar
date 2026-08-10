import { NgModule, Optional, SkipSelf, InjectionToken, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { NotFoundModule } from './not-found';
import { environment } from '../../environments/environment';

///////////////////////////////////
// Declare tree-shakeable tokens //
///////////////////////////////////
export const API_ENDPOINT = new InjectionToken<string>('apiEndpoint', {
  providedIn: 'root',
  factory: () => environment.baseApiUrl
});

/**
 * Components
 */
const coreComponents: any[] = [];

/**
 * Services
 */
const coreServices: any[] = [];

/**
 * Directives
 */
const coreDirectives: any[] = [];

/**
 * Pipes
 */
const corePipes: any[] = [];

@NgModule({
  imports: [
    CommonModule,
    NotFoundModule
  ],
  exports: [coreComponents],
  declarations: [corePipes, coreDirectives, coreComponents],
  providers: [coreServices, provideHttpClient(withInterceptorsFromDi())]
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
