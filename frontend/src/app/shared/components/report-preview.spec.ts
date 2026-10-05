import { TestBed } from '@angular/core/testing';
import { ReportPreview } from './report-preview';
import { Report } from '../../core/models/models';

describe('Vista previa institucional', () => {
  it('respeta el pedido combinado y las fichas particulares sin añadir textos al informe', async () => {
    await TestBed.configureTestingModule({ imports: [ReportPreview] }).compileComponents();
    const report: Report = {
      remitente: 'Técnico',
      cargo_remitente: 'TÉCNICO DTIC',
      destinatario: 'Jefatura',
      cargo_destinatario: 'JEFE DTIC',
      referencia: 'Pedido de materiales',
      fecha: '2026-03-11',
      nota_solicitud: 'NOTA-1',
      unidad_solicitante: 'Facultad',
      introduccion: 'Según nota [NOTA].',
      conclusion: 'Es todo cuanto informo.',
      estado: 'FINALIZADO',
      costos: [{ descripcion: 'Instalación', monto: 20000 }],
      adjuntos: [],
      areas: [
        {
          nombre: 'Planta baja',
          destino: 'Edificio',
          uso: 'Red',
          materiales: [
            {
              material_id: 1,
              nombre: 'Conector',
              unidad: 'PZA',
              cantidad: 80,
              especificaciones: [{ nombre: 'Color', valor: 'Original' }],
              especificaciones_override: [
                { nombre: 'Marca', valor: 'Verificable' },
                { nombre: 'Color', valor: 'Personalizado' },
              ],
            },
          ],
        },
      ],
    };
    const fixture = TestBed.createComponent(ReportPreview);
    fixture.componentRef.setInput('report', report);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.order-title')?.getAttribute('rowspan')).toBe('3');
    expect(element.querySelector('.specifications thead th')?.getAttribute('colspan')).toBe('2');
    const specs = element.querySelector('.specifications')!.textContent;
    expect(specs).toContain('Verificable');
    expect(specs).toContain('Personalizado');
    expect(specs).not.toContain('Original');
    expect(element.textContent).toContain('Según nota NOTA-1.');
    expect(element.textContent).toContain('20000,00');
    expect(element.textContent).not.toContain('COSTO DEL TRABAJO');
    expect(element.textContent).not.toContain('TOTAL');
    expect(element.textContent).not.toContain('UNIVERSIDAD MAYOR DE SAN SIMÓN · DTIC');
  });
});
