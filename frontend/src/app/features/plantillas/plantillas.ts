import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { InformesService } from '../../core/services/informes.service';
import { AuthService } from '../../core/services/auth.service';
import { errorMessage } from '../../core/services/messages';
@Component({
  imports: [ReactiveFormsModule],
  template: `<div class="page-heading">
      <div>
        <span class="eyebrow">CONFIGURACIÓN INSTITUCIONAL</span>
        <h1>Plantillas</h1>
        <p>Valores iniciales del informe técnico RD-RDTIC.</p>
      </div>
    </div>
    <div class="message">
      Estos textos se aplican a nuevos informes. Cada técnico puede adaptarlos sin modificar
      documentos anteriores. Utilice [NOTA] para insertar la nota de solicitud automáticamente.
    </div>
    @if (error()) {
      <div class="message error" role="alert">{{ error() }}</div>
    }
    @if (success()) {
      <div class="message success" role="status">{{ success() }}</div>
    }
    <form class="panel" [formGroup]="form" (ngSubmit)="save()">
      <section class="form-section">
        <h2>Datos del documento</h2>
        <div class="form-grid">
          <label>De<input formControlName="remitente" /></label
          ><label>Cargo<input formControlName="cargo_remitente" /></label
          ><label>Para<input formControlName="destinatario" /></label
          ><label>Cargo del destinatario<input formControlName="cargo_destinatario" /></label
          ><label class="full"
            >Introducción<textarea rows="5" formControlName="introduccion"></textarea></label
          ><label class="full">Conclusión<textarea formControlName="conclusion"></textarea></label>
        </div>
        @if (auth.isAdmin()) {
          <div class="form-actions">
            <button class="primary" [disabled]="busy() || loading()">
              {{ busy() ? 'Guardando…' : 'Guardar valores iniciales' }}
            </button>
          </div>
        }
      </section>
    </form>`,
})
export class Plantillas implements OnInit {
  api = inject(InformesService);
  auth = inject(AuthService);
  form = inject(FormBuilder).nonNullable.group({
    remitente: '',
    cargo_remitente: '',
    destinatario: '',
    cargo_destinatario: '',
    introduccion: '',
    conclusion: '',
  });
  error = signal('');
  success = signal('');
  busy = signal(false);
  loading = signal(true);
  ngOnInit() {
    this.api.defaults().subscribe({
      next: (d) => {
        this.form.patchValue(d);
        this.loading.set(false);
        if (!this.auth.isAdmin()) this.form.disable();
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
  save() {
    this.busy.set(true);
    this.api.saveDefaults(this.form.getRawValue()).subscribe({
      next: () => {
        this.success.set('Valores iniciales guardados.');
        this.busy.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.busy.set(false);
      },
    });
  }
}
