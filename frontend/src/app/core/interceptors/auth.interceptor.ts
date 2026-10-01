import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const own = req.url.startsWith(environment.apiUrl + '/');
  const token = auth.token();
  return next(
    own && token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req,
  ).pipe(
    catchError((error) => {
      if (own && error.status === 401 && !req.url.endsWith('/login')) {
        auth.clear();
        void router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }),
  );
};
