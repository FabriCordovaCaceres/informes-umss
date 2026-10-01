import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MaterialesService } from '../../core/services/materiales.service';
import { AuthService } from '../../core/services/auth.service';
import { Material, Spec } from '../../core/models/models';
import { errorMessage } from '../../core/services/messages';
import { Icon } from '../../shared/components/icon';
@Component({
  imports: [ReactiveFormsModule, Icon],
  template: `<div class="page-heading">
      <div>
        <span class="eyebrow">RECURSOS INSTITUCIONALES</span>
        <h1>Catálogo de materiales</h1>
        <p>Fichas técnicas reutilizables para todos sus informes.</p>
      </div>
      @if (auth.isAdmin()) {
        <button class="primary" (click)="edit()"><app-icon name="plus" /> NUEVO MATERIAL</button>
      }
    </div>
    @if (error()) {
      <div role="alert" class="message error">{{ error() }}</div>
    }
    @if (success()) {
      <div role="status" class="message success">{{ success() }}</div>
    }
    <div class="panel section-spacer">
      <div class="table-toolbar">
        <div class="search">
          <app-icon name="search" /><input
            [formControl]="search"
            placeholder="Buscar por nombre, categoría o detalle…"
            aria-label="Buscar materiales"
          />
        </div>
        <span class="hint">{{ filtered().length }} materiales</span>
      </div>
      @if (loading()) {
        <div class="loading">Cargando catálogo…</div>
      } @else {
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>MATERIAL</th>
                <th>UNIDAD</th>
                <th>CATEGORÍA</th>
                <th>ESPECIFICACIONES</th>
                <th>ESTADO</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              @for (m of filtered(); track m.id) {
                <tr>
                  <td class="reference-cell">{{ m.nombre }}</td>
                  <td>{{ m.unidad }}</td>
                  <td>{{ m.categoria }}</td>
                  <td>{{ m.especificaciones.length }} características</td>
                  <td>
                    <span class="badge" [class.final]="m.activo">{{
                      m.activo ? 'Activo' : 'Inactivo'
                    }}</span>
                  </td>
                  <td>
                    <button
                      class="icon-button"
                      [attr.aria-label]="
                        auth.isAdmin() ? 'Editar material' : 'Ver especificaciones'
                      "
                      (click)="edit(m)"
                    >
                      <app-icon [name]="auth.isAdmin() ? 'edit' : 'eye'" />
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="empty">No se encontraron materiales.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
    @if (open()) {
      <div class="modal-backdrop">
        <section
          class="modal wide"
          role="dialog"
          aria-modal="true"
          aria-labelledby="material-title"
        >
          <h2 id="material-title">{{ editingId ? 'Ficha de material' : 'Nuevo material' }}</h2>
          <p>
            Las características se reutilizan automáticamente. Los informes existentes conservan la
            revisión que utilizaron.
          </p>
          @if (modalError()) {
            <div class="message error" role="alert">{{ modalError() }}</div>
          }
          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="form-grid">
              <label class="full">Nombre *<input formControlName="nombre" /></label
              ><label>Unidad *<input formControlName="unidad" placeholder="PZA" /></label
              ><label>Categoría *<input formControlName="categoria" /></label
              ><label class="full"
                >Descripción<textarea formControlName="descripcion"></textarea></label
              ><label class="checkbox"
                ><input type="checkbox" formControlName="activo" />Material activo</label
              >
            </div>
            <h3 class="section-spacer">Especificaciones técnicas</h3>
            <div formArrayName="especificaciones">
              @for (s of specs.controls; track s; let i = $index) {
                <div class="spec-row" [formGroupName]="i">
                  <input
                    formControlName="nombre"
                    aria-label="Nombre de característica"
                    placeholder="Nombre"
                  /><textarea
                    formControlName="valor"
                    aria-label="Valor de característica"
                    placeholder="Valor"
                  ></textarea>
                  @if (auth.isAdmin()) {
                    <button
                      type="button"
                      class="icon-button danger"
                      aria-label="Eliminar especificación"
                      (click)="specs.removeAt(i)"
                    >
                      <app-icon name="trash" />
                    </button>
                  }
                </div>
              }
            </div>
            @if (!specs.length) {
              <p class="hint">
                No hay datos técnicos registrados. Complete únicamente información verificada.
              </p>
            }
            @if (auth.isAdmin()) {
              <button type="button" class="secondary small" (click)="addSpec()">
                <app-icon name="plus" /> Agregar especificación
              </button>
            }
            @if (form.touched && form.invalid) {
              <p class="field-error">
                Complete los campos obligatorios y el nombre y valor de cada especificación.
              </p>
            }
            <div class="form-actions">
              <button type="button" class="secondary" (click)="open.set(false)" [disabled]="busy()">
                Cerrar
              </button>
              @if (auth.isAdmin()) {
                <button class="primary" [disabled]="busy()">
                  {{ busy() ? 'Guardando…' : 'Guardar material' }}
                </button>
              }
            </div>
          </form>
        </section>
      </div>
    }`,
})
export class Materiales implements OnInit {
  api = inject(MaterialesService);
  auth = inject(AuthService);
  fb = inject(FormBuilder).nonNullable;
  items = signal<Material[]>([]);
  search = new FormControl('', { nonNullable: true });
  query = toSignal(this.search.valueChanges, { initialValue: '' });
  filtered = computed(() =>
    this.items().filter((m) =>
      `${m.nombre} ${m.categoria} ${m.descripcion}`
        .toLowerCase()
        .includes(this.query().toLowerCase()),
    ),
  );
  open = signal(false);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  modalError = signal('');
  success = signal('');
  editingId?: number;
  form = this.fb.group({
    nombre: ['', Validators.required],
    unidad: ['PZA', Validators.required],
    categoria: ['', Validators.required],
    descripcion: [''],
    activo: [true],
    especificaciones: this.fb.array<ReturnType<Materiales['specGroup']>>([]),
  });
  get specs() {
    return this.form.controls.especificaciones;
  }
  specGroup(s: Spec = { nombre: '', valor: '' }) {
    return this.fb.group({
      nombre: [s.nombre, Validators.required],
      valor: [s.valor, Validators.required],
    });
  }
  addSpec(s?: Spec) {
    this.specs.push(this.specGroup(s));
  }
  ngOnInit() {
    this.load();
  }
  load() {
    this.api.list().subscribe({
      next: (m) => {
        this.items.set(m);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }
  edit(m?: Material) {
    this.editingId = m?.id;
    this.modalError.set('');
    this.form.enable();
    this.form.reset({
      nombre: m?.nombre ?? '',
      unidad: m?.unidad ?? 'PZA',
      categoria: m?.categoria ?? '',
      descripcion: m?.descripcion ?? '',
      activo: m?.activo ?? true,
    });
    this.specs.clear();
    m?.especificaciones.forEach((s) => this.addSpec(s));
    if (!this.auth.isAdmin()) this.form.disable();
    this.open.set(true);
  }
  save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true);
    this.api.save({ ...this.form.getRawValue(), id: this.editingId }).subscribe({
      next: () => {
        this.busy.set(false);
        this.open.set(false);
        this.success.set('Material guardado. El catálogo está actualizado.');
        this.load();
      },
      error: (e) => {
        this.modalError.set(errorMessage(e));
        this.busy.set(false);
      },
    });
  }
}
