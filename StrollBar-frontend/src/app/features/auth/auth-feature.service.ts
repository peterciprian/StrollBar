import { Injectable, inject } from '@angular/core';
import { map, tap } from 'rxjs/operators';
import { ApiClientService } from '../../core/api/api-client.service';
import { LoginRequest, RegisterRequest } from '../../core/api/models';

@Injectable({ providedIn: 'root' })
export class AuthFeatureService {
  private readonly api = inject(ApiClientService);

  register(input: RegisterRequest) {
    return this.api.register(input).pipe(map((response) => response.user));
  }

  login(input: LoginRequest) {
    return this.api.login(input).pipe(
      tap((response) => {
        localStorage.setItem('strollbar_access_token', response.accessToken);
      }),
      map((response) => response.user),
    );
  }

  loadMe() {
    return this.api.me();
  }
}
