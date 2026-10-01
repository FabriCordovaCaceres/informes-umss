import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;
  if (!auth.token()) return router.createUrlTree(['/login']);
  if (auth.user())
    return auth.user()!.debe_cambiar_password
      ? router.createUrlTree(['/cambiar-contrasena'])
      : true;
  return auth.restore().pipe(
    map((user) =>
      user.debe_cambiar_password ? router.createUrlTree(['/cambiar-contrasena']) : true,
    ),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};
export const passwordChangeGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;
  if (!auth.token()) return router.createUrlTree(['/login']);
  if (auth.user()) return true;
  return auth.restore().pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};
export const adminGuard: CanActivateFn = () =>
  inject(AuthService).isAdmin() || inject(Router).createUrlTree(['/dashboard']);
export const writerGuard: CanActivateFn = () =>
  inject(AuthService).canWrite() || inject(Router).createUrlTree(['/informes']);
export interface UnsavedForm {
  canLeave(): boolean;
}
export const unsavedGuard: CanDeactivateFn<UnsavedForm> = (component) => component.canLeave();
