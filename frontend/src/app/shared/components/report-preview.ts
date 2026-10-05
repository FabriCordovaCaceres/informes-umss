import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Line, Report } from '../../core/models/models';
@Component({
  selector: 'app-report-preview',
  imports: [DatePipe],
  template: `@if (report(); as r) {
    <div class="document-stack">
      <article class="paper">
        <header>
          <h2>INFORME TÉCNICO</h2>
          <h3>{{ r.codigo_completo || 'RD-RDTIC-N° Por asignar' }}</h3>
          @if (r.estado === 'BORRADOR') {
            <span class="draft-mark">BORRADOR</span>
          }
        </header>
        <dl>
          <dt>De:</dt>
          <dd>
            {{ r.remitente }}<br /><strong>{{ r.cargo_remitente }}</strong>
          </dd>
          <dt>Para:</dt>
          <dd>
            {{ r.destinatario }}<br /><strong>{{ r.cargo_destinatario }}</strong>
          </dd>
          <dt>Ref.:</dt>
          <dd>{{ r.referencia }}</dd>
          <dt>Fecha:</dt>
          <dd>Cochabamba, {{ date(r.fecha) }}</dd>
        </dl>
        <p class="prose">{{ r.introduccion.replaceAll('[NOTA]', r.nota_solicitud) }}</p>
        @for (a of r.areas; track $index) {
          <section>
            <table class="materials">
              <colgroup>
                <col style="width: 5.43%" />
                <col style="width: 14.14%" />
                <col style="width: 10.75%" />
                <col style="width: 28.23%" />
                <col style="width: 13.96%" />
                <col style="width: 13.96%" />
                <col style="width: 13.53%" />
              </colgroup>
              <thead>
                <tr class="request-heading">
                  <th colspan="3" class="institution first">UNIVERSIDAD MAYOR DE SAN SIMON</th>
                  <th rowspan="3" class="order-title">PEDIDO DE MATERIALES<br />{{ a.nombre }}</th>
                  <th colspan="3" class="date-heading">FECHA DE EMISION</th>
                </tr>
                <tr>
                  <th colspan="3" class="institution middle">DTIC</th>
                  <th class="date-heading">DÍA</th>
                  <th class="date-heading">MES</th>
                  <th class="date-heading">AÑO</th>
                </tr>
                <tr>
                  <th colspan="3" class="institution last">COCHABAMBA- BOLIVIA</th>
                  <td class="date-value">{{ r.fecha | date: 'd' : 'UTC' }}</td>
                  <td class="date-value">{{ r.fecha | date: 'M' : 'UTC' }}</td>
                  <td class="date-value">{{ r.fecha | date: 'yyyy' : 'UTC' }}</td>
                </tr>
                <tr class="destination">
                  <th colspan="3">DESTINO:</th>
                  <td colspan="4">{{ a.destino }}</td>
                </tr>
                <tr class="usage">
                  <th colspan="3">USO:</th>
                  <td colspan="4">{{ a.uso }}</td>
                </tr>
                <tr class="column-headings">
                  <th>N°</th>
                  <th>CANTIDAD</th>
                  <th>UNIDAD</th>
                  <th colspan="4">DETALLE</th>
                </tr>
              </thead>
              <tbody>
                @for (m of a.materiales; track $index) {
                  <tr>
                    <td class="center">{{ $index + 1 }}</td>
                    <td class="center">{{ m.cantidad }}</td>
                    <td class="center">{{ m.unidad }}</td>
                    <td colspan="4">{{ m.nombre }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </section>
        }
        @if (r.costos.length) {
          <section>
            <table class="costs">
              <colgroup>
                <col style="width: 12.13%" />
                <col style="width: 75%" />
                <col style="width: 12.87%" />
              </colgroup>
              <thead>
                <tr>
                  <th>ITEM I</th>
                  <th>Descripción</th>
                  <th>Costo Bs.</th>
                </tr>
              </thead>
              <tbody>
                @for (c of r.costos; track $index) {
                  <tr>
                    <td class="center">{{ $index + 1 }}</td>
                    <td>{{ c.descripcion }}</td>
                    <td class="amount">{{ amount(c.monto) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </section>
        }
        <p class="prose">{{ r.conclusion }}</p>
        <p class="signature">
          {{ r.remitente }}<br /><strong>{{ r.cargo_remitente }}</strong>
        </p>
        <div class="attachments">
          C.c Archivos DTIC<br />
          @for (a of r.adjuntos; track $index) {
            <span>{{ a }}<br /></span>
          }
        </div>
        @for (a of r.areas; track $index) {
          @if (a.materiales.length) {
            <h2 class="area-title">ESPECIFICACIONES TÉCNICAS {{ a.nombre }}</h2>
            @for (m of a.materiales; track $index) {
              <section>
                <table class="specifications">
                  <colgroup>
                    <col style="width: 28.56%" />
                    <col style="width: 71.44%" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th colspan="2" class="center">ESPECIFICACIONES TÉCNICAS</th>
                    </tr>
                    <tr>
                      <th>ITEM {{ $index + 1 }}:</th>
                      <th>{{ m.nombre }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (s of brandSpecs(m); track $index) {
                      <tr>
                        <td>{{ s.nombre }}</td>
                        <td>{{ s.valor }}</td>
                      </tr>
                    }
                    <tr>
                      <th colspan="2">Datos generales:</th>
                    </tr>
                    <tr>
                      <td>Cantidad</td>
                      <td>{{ m.cantidad }}</td>
                    </tr>
                    <tr>
                      <th colspan="2">Datos técnicos:</th>
                    </tr>
                    @for (s of technicalSpecs(m); track $index) {
                      <tr>
                        <td>{{ s.nombre }}</td>
                        <td>{{ s.valor }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </section>
            }
          }
        }
      </article>
    </div>
  }`,
  styleUrl: './report-preview.scss',
})
export class ReportPreview {
  report = input.required<Report>();
  date(value: string) {
    return value
      ? new Intl.DateTimeFormat('es-BO', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        })
          .format(new Date(value + 'T12:00:00Z'))
          .replace(/ de (\d{4})$/, ' del $1')
      : '';
  }
  amount(value: number) {
    return Number(value).toFixed(2).replace('.', ',');
  }
  brandSpecs(m: Line) {
    return (m.especificaciones_override ?? m.especificaciones).filter((s) =>
      /^marca(?: y modelo)?$/i.test(s.nombre.trim()),
    );
  }
  technicalSpecs(m: Line) {
    return (m.especificaciones_override ?? m.especificaciones).filter(
      (s) => !/^marca(?: y modelo)?$/i.test(s.nombre.trim()),
    );
  }
}
