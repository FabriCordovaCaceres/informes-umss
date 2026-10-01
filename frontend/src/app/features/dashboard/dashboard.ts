import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { InformesService } from '../../core/services/informes.service';
import { MaterialesService } from '../../core/services/materiales.service';
import { AuthService } from '../../core/services/auth.service';
import { errorMessage } from '../../core/services/messages';
import { Report } from '../../core/models/models';
import { ReportList } from '../informes/report-list';
import { Icon } from '../../shared/components/icon';
@Component({
  imports: [RouterLink, ReportList, Icon],
  template: `<div class="page-heading">
      <div>
        <span class="eyebrow">SISTEMA DE INFORMES TÉCNICOS</span>
        <h1>{{ isList ? 'Informes técnicos' : 'Panel principal' }}</h1>
        <p>
          {{
            isList
              ? 'Administración y consulta de documentos institucionales.'
              : 'Gestión de informes técnicos'
          }}
        </p>
      </div>
      <span class="management">Gestión {{ year }}</span>
    </div>
    @if (error()) {
      <div class="message error" role="alert">
        {{ error() }} <button class="text-link" (click)="load()">Reintentar</button>
      </div>
    }
    @if (!isList) {
      <div class="stats">
        <div class="stat">
          <div>
            <span>Informes generados</span><strong>{{ finalized() }}</strong
            ><small>Documentos finalizados</small>
          </div>
          <div class="stat-icon"><app-icon name="file" /></div>
        </div>
        <div class="stat">
          <div>
            <span>Borradores</span><strong>{{ drafts() }}</strong
            ><small>Pendientes de finalizar</small>
          </div>
          <div class="stat-icon amber"><app-icon name="clock" /></div>
        </div>
        <div class="stat">
          <div>
            <span>Materiales registrados</span><strong>{{ materials() }}</strong
            ><small>En el catálogo institucional</small>
          </div>
          <div class="stat-icon green"><app-icon name="box" /></div>
        </div>
      </div>
    }
    @if (auth.canWrite()) {
      <div class="create-banner">
        <div class="banner-copy">
          <div class="banner-icon"><app-icon name="file" /></div>
          <div>
            <h2>
              {{ isList ? 'Elabore un nuevo informe' : 'Todo listo para su próximo informe' }}
            </h2>
            <p>Seleccione materiales y genere automáticamente sus especificaciones técnicas.</p>
          </div>
        </div>
        <a class="primary" routerLink="/informes/nuevo"><app-icon name="plus" /> NUEVO INFORME</a>
      </div>
    }
    @if (loading()) {
      <div class="panel loading" role="status">Cargando informes…</div>
    } @else {
      <app-report-list
        [reports]="reports()"
        [compact]="!isList"
        (duplicate)="duplicate($event)"
        (remove)="pendingDelete.set($event)"
      />
    }
    @if (!isList) {
      <div class="info-strip">
        <app-icon name="check" />
        <p>
          <strong>Especificaciones técnicas reutilizables</strong> Los informes incorporan las
          fichas del catálogo con la cantidad correspondiente a cada área.
        </p>
        <a routerLink="/materiales">Consultar catálogo <span>→</span></a>
      </div>
    }
    @if (pendingDelete(); as r) {
      <div class="modal-backdrop">
        <section class="modal" role="dialog" aria-modal="true" aria-labelledby="delete-title">
          <h2 id="delete-title">Eliminar borrador {{ r.numero }}/{{ r.gestion }}</h2>
          <p>
            Se eliminarán el borrador, sus áreas y su historial. Esta acción no se puede deshacer.
          </p>
          <div class="form-actions">
            <button class="secondary" (click)="pendingDelete.set(null)" [disabled]="busy()">
              Cancelar</button
            ><button class="danger-button" (click)="deleteConfirmed()" [disabled]="busy()">
              {{ busy() ? 'Eliminando…' : 'Eliminar borrador' }}
            </button>
          </div>
        </section>
      </div>
    }`,
  styles: [
    `
      .stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
        margin: 28px 0;
      }
      .stat {
        background: #fff;
        border: 1px solid #e1e6ed;
        border-radius: 6px;
        padding: 24px;
        display: flex;
        justify-content: space-between;
        box-shadow: 0 2px 3px #102b4c03;
      }
      .stat span {
        font-size: 12px;
        color: #5d6b7f;
      }
      .stat strong {
        display: block;
        font-size: 32px;
        font-weight: 600;
        margin: 14px 0 9px;
        color: #172f4f;
      }
      .stat small {
        font-size: 10px;
        color: #8c97a7;
      }
      .stat-icon {
        background: #eef3fa;
        color: #385c8b;
        border-radius: 7px;
        width: 43px;
        height: 43px;
        display: grid;
        place-items: center;
      }
      .amber {
        color: #997239;
        background: #faf5eb;
      }
      .green {
        color: #4b7b69;
        background: #edf5f1;
      }
      .create-banner {
        margin: 25px 0;
        background: #fff;
        border: 1px solid #e1e6ed;
        border-left: 3px solid #a73544;
        border-radius: 5px;
        padding: 25px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
      }
      .banner-copy {
        display: flex;
        gap: 18px;
        align-items: center;
      }
      .banner-icon {
        color: #244b78;
        background: #f0f3f8;
        padding: 14px;
        border-radius: 5px;
      }
      .create-banner h2 {
        font-size: 15px;
        margin: 0 0 7px;
      }
      .create-banner p {
        font-size: 11px;
        color: #7c8899;
        margin: 0;
        line-height: 1.6;
      }
      .info-strip {
        display: flex;
        align-items: center;
        gap: 13px;
        margin-top: 24px;
        padding: 17px 20px;
        border: 1px solid #e0e7ee;
        border-radius: 5px;
        color: #718198;
      }
      .info-strip > app-icon {
        color: #5d7c9c;
      }
      .info-strip p {
        font-size: 10px;
        line-height: 1.9;
        margin: 0;
      }
      .info-strip strong {
        display: block;
        font-size: 11px;
        color: #42566e;
      }
      .info-strip a {
        margin-left: auto;
        white-space: nowrap;
        font-size: 10px;
        color: #28527d;
        text-decoration: none;
      }
      .info-strip a span {
        margin-left: 10px;
      }
      @media (max-width: 750px) {
        .stats {
          gap: 10px;
        }
        .stat {
          padding: 15px;
        }
        .stat-icon {
          display: none;
        }
        .stat strong {
          font-size: 26px;
        }
        .create-banner {
          align-items: flex-start;
          flex-direction: column;
        }
        .info-strip {
          align-items: flex-start;
          flex-wrap: wrap;
        }
      }
    `,
  ],
})
export class Dashboard implements OnInit {
  api = inject(InformesService);
  catalog = inject(MaterialesService);
  auth = inject(AuthService);
  router = inject(Router);
  isList = inject(ActivatedRoute).snapshot.data['list'] === true;
  year = new Date().getFullYear();
  reports = signal<Report[]>([]);
  materials = signal(0);
  error = signal('');
  loading = signal(true);
  busy = signal(false);
  pendingDelete = signal<Report | null>(null);
  finalized = computed(() => this.reports().filter((r) => r.estado === 'FINALIZADO').length);
  drafts = computed(() => this.reports().filter((r) => r.estado === 'BORRADOR').length);
  ngOnInit() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    forkJoin({ reports: this.api.list(), materials: this.catalog.list() }).subscribe({
      next: (data) => {
        this.reports.set(data.reports);
        this.materials.set(data.materials.length);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }
  duplicate(r: Report) {
    if (this.busy()) return;
    this.busy.set(true);
    this.api.duplicate(r.id!).subscribe({
      next: (copy) => void this.router.navigate(['/informes', copy.id, 'editar']),
      error: (e) => {
        this.error.set(errorMessage(e));
        this.busy.set(false);
      },
    });
  }
  deleteConfirmed() {
    this.busy.set(true);
    this.api.delete(this.pendingDelete()!.id!).subscribe({
      next: () => {
        this.pendingDelete.set(null);
        this.busy.set(false);
        this.load();
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.pendingDelete.set(null);
        this.busy.set(false);
      },
    });
  }
}
