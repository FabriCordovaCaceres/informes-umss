import { Component, input } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Report } from '../../core/models/models';
@Component({
  selector: 'app-report-preview',
  imports: [DatePipe, DecimalPipe],
  template: `@if (report(); as r) {
    <div class="document-stack">
      <article class="paper">
        <header>
          <small>UNIVERSIDAD MAYOR DE SAN SIMÓN · DTIC</small>
          <h2>INFORME TÉCNICO</h2>
          <h3>{{ r.codigo_completo || 'RD-RDTIC-N° Por asignar' }}</h3>
          @if (r.estado === 'BORRADOR') {
            <span class="draft-mark">BORRADOR</span>
          }
        </header>
        <dl>
          <dt>De:</dt>
          <dd>{{ r.remitente }}<br />{{ r.cargo_remitente }}</dd>
          <dt>Para:</dt>
          <dd>{{ r.destinatario }}<br />{{ r.cargo_destinatario }}</dd>
          <dt>Ref.:</dt>
          <dd>
            <strong>{{ r.referencia }}</strong>
          </dd>
          <dt>Fecha:</dt>
          <dd>Cochabamba, {{ date(r.fecha) }}</dd>
        </dl>
        <p class="intro">{{ r.introduccion.replaceAll('[NOTA]', r.nota_solicitud) }}</p>
        @for (a of r.areas; track $index) {
          <section>
            <h3>UNIVERSIDAD MAYOR DE SAN SIMÓN</h3>
            <h3>PEDIDO DE MATERIALES<br />{{ a.nombre }}</h3>
            <p>
              FECHA DE EMISIÓN: {{ r.fecha | date: 'dd/MM/yyyy' : 'UTC' }} · DTIC · COCHABAMBA,
              BOLIVIA
            </p>
            <p><strong>DESTINO:</strong> {{ a.destino }}<br /><strong>USO:</strong> {{ a.uso }}</p>
            <table>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>CANTIDAD</th>
                  <th>UNIDAD</th>
                  <th>DETALLE</th>
                </tr>
              </thead>
              <tbody>
                @for (m of a.materiales; track $index) {
                  <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>{{ m.cantidad }}</td>
                    <td>{{ m.unidad }}</td>
                    <td>{{ m.nombre }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </section>
        }
        @if (r.costos.length) {
          <section>
            <h3>COSTO DEL TRABAJO</h3>
            <table>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Descripción</th>
                  <th>Costo Bs.</th>
                </tr>
              </thead>
              <tbody>
                @for (c of r.costos; track $index) {
                  <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>{{ c.descripcion }}</td>
                    <td class="amount">{{ c.monto | number: '1.2-2' }}</td>
                  </tr>
                }
                <tr>
                  <td colspan="2"><strong>TOTAL</strong></td>
                  <td class="amount">
                    <strong>{{ total(r) | number: '1.2-2' }}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        }
        <p class="conclusion">{{ r.conclusion }}</p>
        <p class="signature">{{ r.remitente }}<br />{{ r.cargo_remitente }}</p>
        <small
          >C.c. Archivos DTIC<br />
          @for (a of r.adjuntos; track $index) {
            <span>{{ a }}<br /></span>
          }
        </small>
        <footer>Informe técnico · {{ r.codigo_completo || 'Borrador' }}</footer>
      </article>
      @for (a of r.areas; track $index) {
        <article class="paper specifications">
          <header>
            <small>UNIVERSIDAD MAYOR DE SAN SIMÓN · DTIC</small>
            <h2>ESPECIFICACIONES TÉCNICAS<br />{{ a.nombre }}</h2>
          </header>
          @for (m of a.materiales; track $index) {
            <section>
              <h3>ESPECIFICACIONES TÉCNICAS</h3>
              <h4>ITEM {{ $index + 1 }}: {{ m.nombre }}</h4>
              <table>
                <tbody>
                  <tr>
                    <th colspan="2">Datos generales</th>
                  </tr>
                  <tr>
                    <td class="spec-name">Cantidad</td>
                    <td>{{ m.cantidad }} {{ m.unidad }}</td>
                  </tr>
                  <tr>
                    <th colspan="2">Datos técnicos</th>
                  </tr>
                  @for (s of m.especificaciones_override ?? m.especificaciones; track $index) {
                    <tr>
                      <td class="spec-name">{{ s.nombre }}</td>
                      <td>{{ s.valor }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="2">Sin datos técnicos registrados.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </section>
          }
          <footer>{{ a.nombre }} · {{ r.codigo_completo }}</footer>
        </article>
      }
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
        }).format(new Date(value + 'T12:00:00Z'))
      : '';
  }
  total(r: Report) {
    return r.costos.reduce((s, c) => s + Number(c.monto), 0);
  }
}
