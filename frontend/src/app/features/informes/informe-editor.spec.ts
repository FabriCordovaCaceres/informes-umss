import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { InformeEditor } from './informe-editor';
import { InformesService } from '../../core/services/informes.service';
import { MaterialesService } from '../../core/services/materiales.service';
import { Material } from '../../core/models/models';
const cable: Material = {
  id: 1,
  nombre: 'Cable UTP',
  unidad: 'PZA',
  categoria: 'Redes',
  descripcion: '',
  activo: true,
  revision_id: 1,
  especificaciones: [{ nombre: 'Longitud', valor: '305 mts' }],
};
describe('Asistente de informes', () => {
  let editor: InformeEditor;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() } } },
        {
          provide: InformesService,
          useValue: {
            next: () => of({ numero: 1, gestion: 2026 }),
            defaults: () => of({}),
            save: vi.fn(() => throwError(() => ({ status: 0 }))),
          },
        },
        { provide: MaterialesService, useValue: { list: () => of([cable]) } },
      ],
    });
    editor = TestBed.runInInjectionContext(() => new InformeEditor());
    editor.materials.set([cable]);
  });
  it('mantiene áreas y cantidades al avanzar y retroceder', () => {
    editor.addArea();
    editor.areas.at(0).controls.nombre.setValue('PLANTA BAJA');
    editor.openPicker(0);
    editor.picker.patchValue({ material_id: 1, cantidad: 4 });
    editor.addMaterial();
    editor.go(3);
    expect(editor.preview()?.areas[0].materiales[0].cantidad).toBe(4);
    editor.go(1);
    editor.go(2);
    expect(editor.lines(0).at(0).controls.cantidad.value).toBe(4);
  });
  it('personaliza una ficha sin modificar el catálogo ni otra área', () => {
    editor.addArea();
    editor.addArea();
    for (const i of [0, 1]) {
      editor.openPicker(i);
      editor.picker.patchValue({ material_id: 1, cantidad: i + 1 });
      editor.addMaterial();
    }
    editor.openSpecs(0, 0);
    editor.enableSpecs();
    editor.specs.at(0).controls.valor.setValue('Personalizado');
    editor.saveSpecs();
    expect(editor.lines(0).at(0).controls.especificaciones_override.value?.[0].valor).toBe(
      'Personalizado',
    );
    expect(editor.lines(1).at(0).controls.especificaciones_override.value).toBeNull();
    expect(cable.especificaciones[0].valor).toBe('305 mts');
  });
  it('impide perder cambios al salir y señala campos faltantes', () => {
    editor.addArea();
    expect(editor.canLeave()).toBe(false);
    expect(editor.leaveBlocked()).toBe(true);
    expect(editor.validation().join(' ')).toContain('al menos un material');
  });
  it('acumula cantidades al agregar el mismo material a un área', () => {
    editor.addArea();
    for (const qty of [4, 2]) {
      editor.openPicker(0);
      editor.picker.patchValue({ material_id: 1, cantidad: qty });
      editor.addMaterial();
    }
    expect(editor.lines(0).length).toBe(1);
    expect(editor.lines(0).at(0).controls.cantidad.value).toBe(6);
  });
  it('muestra los campos faltantes junto al botón de finalizar en la vista previa', async () => {
    await TestBed.compileComponents();
    const fixture = TestBed.createComponent(InformeEditor);
    editor = fixture.componentInstance;
    fixture.detectChanges();
    editor.go(3);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const finalize = element.querySelector<HTMLButtonElement>('.wizard-footer .primary')!;
    finalize.click();
    fixture.detectChanges();

    const alert = element.querySelector('.wizard-footer [role="alert"]');
    expect(alert?.textContent).toContain('Complete el remitente (De).');
    expect(alert?.textContent).toContain('Complete la referencia.');
    expect(alert?.textContent).toContain('Agregue al menos un material.');
    expect(finalize.getAttribute('aria-describedby')).toBe(alert?.id);
    expect(element.querySelectorAll('[role="alert"]').length).toBe(1);
    expect(element.querySelector('[role="dialog"]')).toBeNull();
    expect(editor.form.controls.referencia.touched).toBe(true);
    expect(editor.api.save).not.toHaveBeenCalled();
  });
  it('mantiene los errores de guardado junto a los botones al cerrar la confirmación', async () => {
    await TestBed.compileComponents();
    const fixture = TestBed.createComponent(InformeEditor);
    editor = fixture.componentInstance;
    fixture.detectChanges();
    editor.form.patchValue({ remitente: 'Técnico', destinatario: 'Jefe', referencia: 'Redes' });
    editor.addArea();
    editor.areas.at(0).controls.nombre.setValue('Planta baja');
    editor.openPicker(0);
    editor.picker.patchValue({ material_id: 1, cantidad: 4 });
    editor.addMaterial();
    editor.go(3);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    element.querySelector<HTMLButtonElement>('.wizard-footer .primary')!.click();
    fixture.detectChanges();
    expect(element.querySelector('[role="dialog"]')).not.toBeNull();
    element.querySelector<HTMLButtonElement>('[role="dialog"] .primary')!.click();
    fixture.detectChanges();

    expect(element.querySelector('.wizard-footer [role="alert"]')?.textContent).toContain(
      'No se pudo conectar con el servidor.',
    );
    expect(element.querySelectorAll('[role="alert"]').length).toBe(1);
    expect(element.querySelector('[role="dialog"]')).toBeNull();
    expect(editor.api.save).toHaveBeenCalledOnce();
    expect(editor.busy()).toBe(false);
  });
});
