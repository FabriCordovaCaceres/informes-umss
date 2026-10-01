import { Component, inject, input, output, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Report } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { Icon } from '../../shared/components/icon';
@Component({
  selector: 'app-report-list',
  imports: [RouterLink, DatePipe, Icon, ReactiveFormsModule],
  template: ` <div class="panel">
    <div class="panel-heading">
      <div>
        <h2>{{ compact() ? 'Informes recientes' : 'Registro de informes' }}</h2>
        <p>
          {{
            compact()
              ? 'Consulte y gestione los últimos informes técnicos.'
              : 'Todos los informes técnicos de su departamento.'
          }}
        </p>
      </div>
      @if (compact()) {
        <a class="text-link" routerLink="/informes">Ver todos <app-icon name="arrow" /></a>
      }
    </div>
    <div class="table-toolbar">
      <div class="search">
        <app-icon name="search" /><input
          [formControl]="search"
          placeholder="Buscar por número, referencia o unidad…"
          aria-label="Buscar informes"
        />
      </div>
      <select [formControl]="status" aria-label="Filtrar por estado">
        <option value="">Todos los estados</option>
        <option value="BORRADOR">Borrador</option>
        <option value="FINALIZADO">Finalizado</option>
      </select>
    </div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>N.º INFORME</th>
            <th>REFERENCIA</th>
            <th>UNIDAD SOLICITANTE</th>
            <th>FECHA</th>
            <th>ESTADO</th>
            <th>ACCIONES</th>
          </tr>
        </thead>
        <tbody>
          @for (r of visible(); track r.id) {
            <tr>
              <td>
                <a class="report-number" [routerLink]="['/informes', r.id]"
                  >{{ r.numero }}/{{ r.gestion }}</a
                ><small class="subtext">RD-RDTIC</small>
              </td>
              <td class="reference-cell">{{ r.referencia || 'Sin referencia' }}</td>
              <td>{{ r.unidad_solicitante || 'Sin especificar' }}</td>
              <td class="nowrap">{{ r.fecha | date: 'dd/MM/yyyy' : 'UTC' }}</td>
              <td>
                <span class="badge" [class.final]="r.estado === 'FINALIZADO'"
                  ><span></span>{{ r.estado === 'BORRADOR' ? 'Borrador' : 'Finalizado' }}</span
                >
              </td>
              <td>
                <div class="actions">
                  <a
                    class="icon-button"
                    [routerLink]="['/informes', r.id]"
                    title="Ver informe"
                    aria-label="Ver informe"
                    ><app-icon name="eye"
                  /></a>
                  @if (auth.canWrite()) {
                    @if (r.estado === 'BORRADOR') {
                      <a
                        class="icon-button"
                        [routerLink]="['/informes', r.id, 'editar']"
                        title="Editar"
                        aria-label="Editar informe"
                        ><app-icon name="edit"
                      /></a>
                    }
                    <button
                      class="icon-button"
                      (click)="duplicate.emit(r)"
                      title="Duplicar"
                      aria-label="Duplicar informe"
                    >
                      <app-icon name="copy" />
                    </button>
                    @if (r.estado === 'BORRADOR') {
                      <button
                        class="icon-button danger"
                        (click)="remove.emit(r)"
                        title="Eliminar borrador"
                        aria-label="Eliminar borrador"
                      >
                        <app-icon name="trash" />
                      </button>
                    }
                  }
                </div>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="6">
                <div class="empty">
                  <app-icon name="file" />
                  <h3>
                    {{
                      reports().length
                        ? 'No se encontraron informes'
                        : 'Aún no hay informes técnicos'
                    }}
                  </h3>
                  <p>
                    {{
                      reports().length
                        ? 'Pruebe con otro término de búsqueda.'
                        : 'Cree su primer informe utilizando el catálogo institucional.'
                    }}
                  </p>
                  @if (!reports().length && auth.canWrite()) {
                    <a routerLink="/informes/nuevo" class="secondary">Crear un informe</a>
                  }
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <div class="table-footer">
      <span
        >{{ filtered().length }} informe(s) ·
        {{ compact() ? 'Últimos registros' : 'Página ' + page() + ' de ' + pages() }}</span
      >
      @if (!compact() && pages() > 1) {
        <div class="actions">
          <button class="secondary small" (click)="page.set(page() - 1)" [disabled]="page() <= 1">
            Anterior</button
          ><button
            class="secondary small"
            (click)="page.set(page() + 1)"
            [disabled]="page() >= pages()"
          >
            Siguiente
          </button>
        </div>
      }
    </div>
  </div>`,
})
export class ReportList {
  auth = inject(AuthService);
  reports = input<Report[]>([]);
  compact = input(false);
  duplicate = output<Report>();
  remove = output<Report>();
  search = new FormControl('', { nonNullable: true });
  status = new FormControl('', { nonNullable: true });
  query = toSignal(this.search.valueChanges, { initialValue: '' });
  state = toSignal(this.status.valueChanges, { initialValue: '' });
  page = signal(1);
  filtered = computed(() => {
    const q = this.query().toLowerCase();
    return this.reports().filter(
      (r) =>
        (!this.state() || r.estado === this.state()) &&
        `${r.codigo_completo} ${r.referencia} ${r.unidad_solicitante}`.toLowerCase().includes(q),
    );
  });
  pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / 10)));
  visible = computed(() =>
    this.filtered().slice(
      this.compact() ? 0 : (Math.min(this.page(), this.pages()) - 1) * 10,
      this.compact() ? 5 : Math.min(this.page(), this.pages()) * 10,
    ),
  );
  constructor() {
    this.search.valueChanges.subscribe(() => this.page.set(1));
    this.status.valueChanges.subscribe(() => this.page.set(1));
  }
}
