import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/models';
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private browser = isPlatformBrowser(inject(PLATFORM_ID));
  user = signal<User | null>(null);
  token = signal<string | null>(this.browser ? sessionStorage.getItem('umss-token') : null);
  login(credentials: { usuario: string; password: string }) {
    return this.http
      .post<{ token: string; user: User }>(environment.apiUrl + '/auth/login', credentials)
      .pipe(
        tap((data) => {
          this.token.set(data.token);
          this.user.set(data.user);
          if (this.browser) sessionStorage.setItem('umss-token', data.token);
        }),
      );
  }
  restore() {
    return this.http
      .get<User>(environment.apiUrl + '/auth/me')
      .pipe(tap((user) => this.user.set(user)));
  }
  changePassword(password_actual: string, password_nueva: string) {
    return this.http
      .post<{ debe_cambiar_password: boolean }>(environment.apiUrl + '/auth/change-password', {
        password_actual,
        password_nueva,
      })
      .pipe(
        tap(() => {
          const current = this.user();
          if (current) this.user.set({ ...current, debe_cambiar_password: false });
        }),
      );
  }
  clear() {
    this.token.set(null);
    this.user.set(null);
    if (this.browser) sessionStorage.removeItem('umss-token');
  }
  logout() {
    this.http
      .post(environment.apiUrl + '/auth/logout', {})
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this.clear();
        void this.router.navigateByUrl('/login');
      });
  }
  canWrite() {
    return this.user()?.rol !== 'JEFE';
  }
  isAdmin() {
    return this.user()?.rol === 'ADMINISTRADOR';
  }
}
