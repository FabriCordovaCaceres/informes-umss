import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { of } from 'rxjs';
import { User } from '../models/models';
import { AuthService } from '../services/auth.service';
import { authGuard, passwordChangeGuard } from './auth.guard';

const user: User = {
  id: 2,
  usuario: 'tecnico1',
  nombre: 'Técnico 1',
  correo: 'tecnico1@local.invalid',
  cargo: 'TÉCNICO DTIC',
  rol: 'TECNICO',
  activo: true,
  debe_cambiar_password: true,
};
const route = {} as ActivatedRouteSnapshot;
const state = {} as RouterStateSnapshot;

describe('cambio obligatorio de contraseña', () => {
  it('redirige al cambio aunque el usuario intente abrir el panel directamente', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: AuthService,
          useValue: { token: signal('sesion'), user: signal(user), restore: () => of(user) },
        },
      ],
    });
    const result = TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(result instanceof UrlTree).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/cambiar-contrasena');
    expect(TestBed.runInInjectionContext(() => passwordChangeGuard(route, state))).toBe(true);
  });

  it('deja entrar al panel después del cambio', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: AuthService,
          useValue: {
            token: signal('sesion'),
            user: signal({ ...user, debe_cambiar_password: false }),
          },
        },
      ],
    });
    expect(TestBed.runInInjectionContext(() => authGuard(route, state))).toBe(true);
  });
});
