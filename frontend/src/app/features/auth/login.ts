import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { errorMessage } from '../../core/services/messages';
import { Icon } from '../../shared/components/icon';
@Component({
  imports: [ReactiveFormsModule, Icon],
  template: `<div class="login">
    <section class="identity">
      <div class="university">
        <app-icon name="building" /><strong>UMSS</strong><span>UNIVERSIDAD MAYOR DE SAN SIMÓN</span>
      </div>
      <div>
        <span class="eyebrow">DIRECCIÓN DE TECNOLOGÍAS DE INFORMACIÓN Y COMUNICACIÓN</span>
        <h1>Sistema de<br />Informes Técnicos</h1>
        <div class="red-line"></div>
        <p>
          Plataforma para la generación, gestión y almacenamiento de informes técnicos
          institucionales.
        </p>
        <span class="department">DTIC · COCHABAMBA, BOLIVIA</span>
      </div>
      <small>Universidad Mayor de San Simón</small>
    </section>
    <section class="login-form">
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="login-icon"><app-icon name="lock" /></div>
        <span class="eyebrow">ACCESO AL SISTEMA</span>
        <h2>Bienvenido</h2>
        <p>Ingrese sus credenciales institucionales para continuar.</p>
        @if (error()) {
          <div class="message error" role="alert">{{ error() }}</div>
        }
        <label
          >Usuario<input
            formControlName="usuario"
            autocomplete="username"
            placeholder="Ingrese su usuario" /></label
        ><label
          >Contraseña<input
            formControlName="password"
            type="password"
            autocomplete="current-password"
            placeholder="Ingrese su contraseña"
        /></label>
        @if (form.touched && form.invalid) {
          <p class="field-error">Ingrese su usuario y contraseña.</p>
        }
        <button class="primary" [disabled]="busy()">
          {{ busy() ? 'Ingresando…' : 'INGRESAR' }} <app-icon name="arrow" />
        </button>
        <div class="access-note">
          <app-icon name="lock" />Acceso exclusivo para personal autorizado.
        </div>
      </form>
      <small>SISTEMA DE GENERACIÓN DE INFORMES TÉCNICOS – UMSS</small>
    </section>
  </div>`,
  styleUrl: './login.scss',
})
export class Login {
  auth = inject(AuthService);
  router = inject(Router);
  form = inject(FormBuilder).nonNullable.group({
    usuario: ['', Validators.required],
    password: ['', Validators.required],
  });
  busy = signal(false);
  error = signal('');
  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true);
    this.error.set('');
    this.auth.login(this.form.getRawValue()).subscribe({
      next: ({ user }) =>
        void this.router.navigateByUrl(
          user.debe_cambiar_password ? '/cambiar-contrasena' : '/dashboard',
        ),
      error: (e) => {
        this.error.set(errorMessage(e));
        this.busy.set(false);
      },
    });
  }
}
