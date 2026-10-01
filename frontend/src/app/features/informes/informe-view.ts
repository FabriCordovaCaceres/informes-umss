import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InformesService } from '../../core/services/informes.service';
import { AuthService } from '../../core/services/auth.service';
import { Report } from '../../core/models/models';
import { downloadFile, errorMessage } from '../../core/services/messages';
import { ReportPreview } from '../../shared/components/report-preview';
import { Icon } from '../../shared/components/icon';
@Component({
  imports: [RouterLink, DatePipe, ReportPreview, Icon],
  template: `<div class="page-heading">
      <div>
        <span class="eyebrow">DOCUMENTO INSTITUCIONAL</span>
        <h1>{{ report()?.codigo_completo || 'Informe técnico' }}</h1>
        <p>Vista previa y trazabilidad del informe.</p>
      </div>
      <a class="secondary" routerLink="/informes">Volver al registro</a>
    </div>
    @if (error()) {
      <div class="message error" role="alert">{{ error() }}</div>
    }
    @if (report(); as r) {
      <div class="document-actions">
        <span class="badge" [class.final]="r.estado === 'FINALIZADO'">{{ r.estado }}</span>
        <div class="actions">
          @if (auth.canWrite()) {
            @if (r.estado === 'BORRADOR') {
              <a class="secondary" [routerLink]="['/informes', r.id, 'editar']"
                ><app-icon name="edit" />Editar</a
              >
            }
            <button class="secondary" (click)="duplicate()" [disabled]="busy()">
              <app-icon name="copy" />Duplicar informe
            </button>
          }
          <button class="secondary" (click)="download('docx')" [disabled]="busy()">
            <app-icon name="download" /> Word</button
          ><button class="primary" (click)="download('pdf')" [disabled]="busy()">
            <app-icon name="download" /> PDF
          </button>
        </div>
      </div>
      <p class="hint">
        La vista previa muestra el contenido. Los archivos exportados incluyen paginación A4
        automática.
      </p>
      <app-report-preview [report]="r" />
      <section class="panel section-spacer">
        <div class="panel-heading"><h2>Historial del informe</h2></div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>FECHA</th>
                <th>USUARIO</th>
                <th>ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              @for (h of r.historial; track $index) {
                <tr>
                  <td>{{ h.fecha | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td>{{ h.nombre }}</td>
                  <td>{{ h.accion }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    } @else {
      <div class="loading">
        {{ error() ? 'No se pudo abrir el informe.' : 'Cargando informe…' }}
      </div>
    }`,
  styles: [
    `
      .document-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 15px;
        margin: 25px 0;
      }
      .actions {
        flex-wrap: wrap;
      }
      @media (max-width: 750px) {
        .document-actions {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `,
  ],
})
export class InformeView implements OnInit {
  api = inject(InformesService);
  auth = inject(AuthService);
  router = inject(Router);
  id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  report = signal<Report | null>(null);
  error = signal('');
  busy = signal(false);
  ngOnInit() {
    this.load();
  }
  load() {
    this.api
      .get(this.id)
      .subscribe({
        next: (r) => this.report.set(r),
        error: (e) => this.error.set(errorMessage(e)),
      });
  }
  duplicate() {
    this.busy.set(true);
    this.api.duplicate(this.id).subscribe({
      next: (r) => void this.router.navigate(['/informes', r.id, 'editar']),
      error: (e) => {
        this.error.set(errorMessage(e));
        this.busy.set(false);
      },
    });
  }
  download(format: 'pdf' | 'docx') {
    this.busy.set(true);
    this.error.set('');
    this.api.document(this.id, format).subscribe({
      next: (blob) => {
        downloadFile(blob, `Informe-${this.report()!.numero}-${this.report()!.gestion}.${format}`);
        this.busy.set(false);
        this.load();
      },
      error: async (e) => {
        let message = errorMessage(e);
        if (e.error instanceof Blob) {
          try {
            message = JSON.parse(await e.error.text()).message;
          } catch {}
        }
        this.error.set(message);
        this.busy.set(false);
      },
    });
  }
}
