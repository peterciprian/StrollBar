import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
  HttpResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, tap } from 'rxjs/operators';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class InterceptorService implements HttpInterceptor {
  public isLoading = false;
  constructor(private notification: NotificationService) { }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (request.method === 'POST') {
      return next.handle(request).pipe(
        tap((event: HttpEvent<any>) => {
          if (event instanceof HttpResponse && event.status === 201) {
            this.notification.showSuccess('Operation successful');
          }
        }),
        retry(1),
        catchError((error: HttpErrorResponse) => {
          this.notification.showError(error.message);
          return throwError(error);
        })
      );
    } else {
      return next.handle(request).pipe(
        retry(1),
        catchError((error: HttpErrorResponse) => {
          this.notification.showError(error.message);
          return throwError(error);
        })
      );
    }
  }
}
