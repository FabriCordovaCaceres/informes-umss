import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { errorMessage } from '../../core/services/messages';
import { Icon } from '../../shared/components/icon';

@Component({
  imports: [ReactiveFormsModule, Icon],
  template: `<div class="password-page">
    <form class="password-card" [formGroup]="form" (ngSubmit)="submit()">
      <div class="login-icon"><app-icon name="lock" /></div>
      <span class="eyebrow">{{
        auth.user()?.debe_cambiar_password ? 'PRIMER INGRESO' : 'MI CUENTA'
      }}</span>
      <h1>Elija su contraseña</h1>
      @if (auth.user()?.debe_cambiar_password) {
        <p>La contraseña que recibió es temporal. Cámbiela antes de acceder al sistema.</p>
      }
      <p>Use una frase o contraseña de al menos 15 caracteres.</p>
      @if (error()) {
        <div class="message error" role="alert">{{ error() }}</div>
      }
      <label
        >Contraseña actual
        <input formControlName="password_actual" type="password" autocomplete="current-password" />
      </label>
      <label
        >Nueva contraseña
        <input formControlName="password_nueva" type="password" autocomplete="new-password" />
      </label>
      <label
        >Repita la nueva contraseña
        <input formControlName="confirmacion" type="password" autocomplete="new-password" />
      </label>
      @if (form.touched && form.invalid) {
        <p class="field-error">
          Complete los campos. La nueva contraseña debe tener al menos 15 caracteres.
        </p>
      }
      <button class="primary" [disabled]="busy()">
        {{ busy() ? 'Guardando…' : 'GUARDAR CONTRASEÑA' }} <app-icon name="arrow" />
      </button>
      <button type="button" class="secondary" (click)="auth.logout()" [disabled]="busy()">
        Salir
      </button>
    </form>
  </div>`,
  styles: [
    `
      .password-page {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background: #f1f4f8;
      }
      .password-card {
        width: min(100%, 440px);
        background: white;
        padding: 42px;
        border-radius: 8px;
        box-shadow: 0 14px 45px #102b4c19;
      }
      .login-icon {
        background: #edf2f7;
        color: #284b72;
        width: 48px;
        height: 48px;
        display: grid;
        place-items: center;
        border-radius: 6px;
        margin-bottom: 22px;
      }
      .password-card h1 {
        font-size: 28px;
        margin: 12px 0;
      }
      .password-card p {
        color: #65758a;
        line-height: 1.6;
      }
      .password-card label {
        display: block;
        margin-top: 20px;
      }
      .password-card input {
        width: 100%;
        height: 46px;
        margin-top: 8px;
      }
      .password-card button {
        width: 100%;
        margin-top: 24px;
        justify-content: center;
      }
      .password-card button.secondary {
        margin-top: 12px;
      }
      @media (max-width: 500px) {
        .password-card {
          padding: 28px 22px;
        }
      }
    `,
  ],
})
export class PasswordChange {
  auth = inject(AuthService);
  private router = inject(Router);
  form = inject(FormBuilder).nonNullable.group({
    password_actual: ['', Validators.required],
    password_nueva: ['', [Validators.required, Validators.minLength(15)]],
    confirmacion: ['', Validators.required],
  });
  busy = signal(false);
  error = signal('');

  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const values = this.form.getRawValue();
    if (values.password_nueva !== values.confirmacion) {
      this.error.set('Las contraseñas nuevas no coinciden.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.auth.changePassword(values.password_actual, values.password_nueva).subscribe({
      next: () => void this.router.navigateByUrl('/dashboard'),
      error: (e) => {
        this.error.set(errorMessage(e));
        this.busy.set(false);
      },
    });
  }
}
