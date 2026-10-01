import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsuariosService } from '../../core/services/usuarios.service';
import { User } from '../../core/models/models';
import { errorMessage } from '../../core/services/messages';
import { Icon } from '../../shared/components/icon';
import { AuthService } from '../../core/services/auth.service';
@Component({
  imports: [ReactiveFormsModule, Icon],
  template: `<div class="page-heading">
      <div>
        <span class="eyebrow">ADMINISTRACIÓN</span>
        <h1>Usuarios</h1>
        <p>Personal autorizado y roles del departamento.</p>
      </div>
      <button class="primary" (click)="edit()"><app-icon name="plus" /> NUEVO USUARIO</button>
    </div>
    @if (error()) {
      <div class="message error" role="alert">{{ error() }}</div>
    }
    <div class="panel section-spacer">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>NOMBRE</th>
              <th>USUARIO</th>
              <th>CARGO</th>
              <th>ROL</th>
              <th>ESTADO</th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            @for (u of users(); track u.id) {
              <tr>
                <td>
                  {{ u.nombre }}<small class="subtext">{{ u.correo }}</small>
                </td>
                <td>{{ u.usuario }}</td>
                <td>{{ u.cargo }}</td>
                <td>{{ u.rol }}</td>
                <td>
                  <span class="badge" [class.final]="u.activo">{{
                    u.activo ? 'Activo' : 'Inactivo'
                  }}</span>
                  @if (u.debe_cambiar_password) {
                    <small class="subtext">Cambio de contraseña pendiente</small>
                  }
                </td>
                <td>
                  <button class="icon-button" aria-label="Editar usuario" (click)="edit(u)">
                    <app-icon name="edit" />
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="empty">
                  {{ loading() ? 'Cargando usuarios…' : 'Sin usuarios para mostrar.' }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
    <div class="message">
      Administrador: gestiona catálogo y usuarios. Técnico: crea y edita sus borradores. Jefe:
      consulta documentos e historial.
    </div>
    @if (open()) {
      <div class="modal-backdrop">
        <section class="modal" role="dialog" aria-modal="true" aria-labelledby="user-title">
          <h2 id="user-title">{{ id ? 'Editar usuario' : 'Nuevo usuario' }}</h2>
          @if (modalError()) {
            <div class="message error" role="alert">{{ modalError() }}</div>
          }
          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="form-grid">
              <label class="full">Nombre *<input formControlName="nombre" /></label
              ><label>Usuario *<input formControlName="usuario" autocomplete="off" /></label
              ><label>Correo *<input formControlName="correo" type="email" /></label
              ><label>Cargo *<input formControlName="cargo" /></label
              ><label
                >Rol<select formControlName="rol">
                  <option>ADMINISTRADOR</option>
                  <option>TECNICO</option>
                  <option>JEFE</option>
                </select></label
              >
              @if (id !== auth.user()?.id) {
                <label class="full"
                  >Contraseña temporal {{ id ? '(dejar vacía para conservar)' : '*'
                  }}<input
                    formControlName="password"
                    type="password"
                    autocomplete="new-password"
                    placeholder="Mínimo 15 caracteres"
                  />
                  <small
                    >Al asignar una contraseña, esa persona deberá cambiarla al ingresar.</small
                  >
                </label>
              }
              <label class="checkbox"
                ><input type="checkbox" formControlName="activo" />Cuenta activa</label
              >
            </div>
            @if (form.touched && form.invalid) {
              <p class="field-error">
                Revise los campos obligatorios, correo y contraseña (mínimo 15 caracteres).
              </p>
            }
            <div class="form-actions">
              <button type="button" class="secondary" (click)="open.set(false)" [disabled]="busy()">
                Cancelar</button
              ><button class="primary" [disabled]="busy()">
                {{ busy() ? 'Guardando…' : 'Guardar usuario' }}
              </button>
            </div>
          </form>
        </section>
      </div>
    }`,
})
export class Usuarios implements OnInit {
  api = inject(UsuariosService);
  auth = inject(AuthService);
  fb = inject(FormBuilder).nonNullable;
  users = signal<User[]>([]);
  error = signal('');
  modalError = signal('');
  open = signal(false);
  busy = signal(false);
  loading = signal(true);
  id?: number;
  form = this.fb.group({
    nombre: ['', Validators.required],
    usuario: ['', [Validators.required, Validators.minLength(3)]],
    correo: ['', [Validators.required, Validators.email]],
    cargo: ['', Validators.required],
    rol: ['TECNICO' as User['rol']],
    activo: [true],
    password: ['', Validators.minLength(15)],
  });
  ngOnInit() {
    this.load();
  }
  load() {
    this.api.list().subscribe({
      next: (u) => {
        this.users.set(u);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }
  edit(u?: User) {
    this.id = u?.id;
    this.modalError.set('');
    this.form.reset({
      nombre: u?.nombre ?? '',
      usuario: u?.usuario ?? '',
      correo: u?.correo ?? '',
      cargo: u?.cargo ?? '',
      rol: u?.rol ?? 'TECNICO',
      activo: u?.activo ?? true,
      password: '',
    });
    this.form.controls.password.setValidators(
      u ? [Validators.minLength(15)] : [Validators.required, Validators.minLength(15)],
    );
    this.form.controls.password.updateValueAndValidity();
    this.open.set(true);
  }
  save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true);
    const v = this.form.getRawValue();
    this.api.save({ ...v, id: this.id, password: v.password || undefined }).subscribe({
      next: () => {
        this.open.set(false);
        this.busy.set(false);
        this.load();
      },
      error: (e) => {
        this.modalError.set(errorMessage(e));
        this.busy.set(false);
      },
    });
  }
}
