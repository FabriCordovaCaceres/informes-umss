import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { InformeEditor } from './informe-editor';
import { InformesService } from '../../core/services/informes.service';
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
        { provide: InformesService, useValue: { next: () => of({ numero: 1, gestion: 2026 }) } },
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
});
