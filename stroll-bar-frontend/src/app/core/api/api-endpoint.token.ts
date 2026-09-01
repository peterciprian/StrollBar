import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export const API_ENDPOINT = new InjectionToken<string>('apiEndpoint', {
	providedIn: 'root',
	factory: () => environment.baseApiUrl
});
