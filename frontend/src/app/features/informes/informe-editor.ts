import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { InformesService } from '../../core/services/informes.service';
import { MaterialesService } from '../../core/services/materiales.service';
import { AuthService } from '../../core/services/auth.service';
import { Report, Area, Line, Material, Spec } from '../../core/models/models';
import { errorMessage } from '../../core/services/messages';
import { ReportPreview } from '../../shared/components/report-preview';
import { Icon } from '../../shared/components/icon';
@Component({
  imports: [ReactiveFormsModule, ReportPreview, Icon],
  templateUrl: './informe-editor.html',
  styleUrl: './informe-editor.scss',
})
export class InformeEditor implements OnInit {
  api = inject(InformesService);
  catalog = inject(MaterialesService);
  auth = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  fb = inject(FormBuilder).nonNullable;
  id = Number(this.route.snapshot.paramMap.get('id')) || undefined;
  version?: number;
  code = signal('Se asignará al guardar');
  numberHint = signal('');
  step = signal(1);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  success = signal('');
  leaveBlocked = signal(false);
  finalConfirm = signal(false);
  materials = signal<Material[]>([]);
  preview = signal<Report | null>(null);
  specTarget = signal<{ area: number; line: number } | null>(null);
  specEditable = signal(false);
  form = this.fb.group({
    remitente: ['', Validators.required],
    cargo_remitente: [''],
    destinatario: ['', Validators.required],
    cargo_destinatario: [''],
    referencia: ['', Validators.required],
    fecha: [
      new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date()),
      Validators.required,
    ],
    nota_solicitud: [''],
    unidad_solicitante: [''],
    introduccion: [''],
    conclusion: [''],
    areas: this.fb.array<ReturnType<InformeEditor['areaGroup']>>([]),
    costos: this.fb.array<ReturnType<InformeEditor['costGroup']>>([]),
    adjuntos: this.fb.array<ReturnType<InformeEditor['attachmentGroup']>>([]),
  });
  picker = this.fb.group({
    search: '',
    material_id: [0, Validators.min(1)],
    cantidad: [1, [Validators.required, Validators.min(0.001), Validators.max(999999999)]],
  });
  pickerArea = signal<number | null>(null);
  specForm = this.fb.group({ items: this.fb.array<ReturnType<InformeEditor['specGroup']>>([]) });
  get areas() {
    return this.form.controls.areas;
  }
  get costs() {
    return this.form.controls.costos;
  }
  get attachments() {
    return this.form.controls.adjuntos;
  }
  get specs() {
    return this.specForm.controls.items;
  }
  areaGroup(a: Area = { nombre: '', destino: '', uso: '', materiales: [] }) {
    return this.fb.group({
      nombre: [a.nombre, Validators.required],
      destino: [a.destino],
      uso: [a.uso],
      materiales: this.fb.array(a.materiales.map((m) => this.lineGroup(m))),
    });
  }
  lineGroup(m: Line) {
    return this.fb.group({
      material_id: m.material_id,
      revision_id: m.revision_id,
      nombre: m.nombre,
      unidad: m.unidad,
      descripcion: m.descripcion ?? '',
      cantidad: [
        m.cantidad,
        [Validators.required, Validators.min(0.001), Validators.max(999999999)],
      ],
      especificaciones: this.fb.control<Spec[]>(m.especificaciones),
      especificaciones_override: this.fb.control<Spec[] | null>(
        m.especificaciones_override ?? null,
      ),
    });
  }
  costGroup(c = { descripcion: '', monto: 0 }) {
    return this.fb.group({
      descripcion: [c.descripcion, Validators.required],
      monto: [c.monto, [Validators.required, Validators.min(0), Validators.max(99999999999)]],
    });
  }
  attachmentGroup(value = '') {
    return this.fb.control(value, Validators.required);
  }
  specGroup(s: Spec = { nombre: '', valor: '' }) {
    return this.fb.group({
      nombre: [s.nombre, Validators.required],
      valor: [s.valor, Validators.required],
    });
  }
  ngOnInit() {
    forkJoin({ materials: this.catalog.list(), defaults: this.api.defaults() }).subscribe({
      next: (data) => {
        this.materials.set(data.materials);
        if (this.id) {
          this.api.get(this.id).subscribe({
            next: (r) => {
              if (r.estado === 'FINALIZADO') {
                void this.router.navigate(['/informes', r.id]);
                return;
              }
              this.populate(r);
              this.loading.set(false);
            },
            error: (e) => {
              this.error.set(errorMessage(e));
              this.loading.set(false);
            },
          });
        } else {
          this.form.patchValue(data.defaults);
          if (this.auth.user()?.rol === 'TECNICO')
            this.form.patchValue({
              remitente: this.auth.user()!.nombre,
              cargo_remitente: this.auth.user()!.cargo,
            });
          this.attachments.push(this.attachmentGroup('Adjunto Especificaciones técnicas'));
          this.loading.set(false);
          this.number();
        }
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
    this.form.controls.fecha.valueChanges.subscribe(() => this.number());
  }
  number() {
    if (this.id) return;
    const year = Number(this.form.controls.fecha.value.slice(0, 4));
    if (!year) return;
    this.api
      .next(year)
      .subscribe({
        next: (n) =>
          this.numberHint.set(
            `Próximo estimado: RD-RDTIC-N° ${n.numero}/${n.gestion}. El número definitivo se reserva al guardar.`,
          ),
        error: () => this.numberHint.set('El número se asignará automáticamente al guardar.'),
      });
  }
  populate(r: Report) {
    this.id = r.id;
    this.version = r.version;
    this.code.set(r.codigo_completo!);
    this.form.patchValue(r);
    this.areas.clear();
    r.areas.forEach((a) => this.areas.push(this.areaGroup(a)));
    this.costs.clear();
    r.costos.forEach((c) => this.costs.push(this.costGroup(c)));
    this.attachments.clear();
    r.adjuntos.forEach((a) => this.attachments.push(this.attachmentGroup(a)));
    this.form.markAsPristine();
    this.preview.set(r);
  }
  addArea() {
    this.areas.push(this.areaGroup());
    this.form.markAsDirty();
  }
  removeArea(i: number) {
    this.areas.removeAt(i);
    this.form.markAsDirty();
  }
  lines(i: number) {
    return this.areas.at(i).controls.materiales;
  }
  removeLine(a: number, i: number) {
    this.lines(a).removeAt(i);
    this.form.markAsDirty();
  }
  addCost() {
    this.costs.push(this.costGroup());
    this.form.markAsDirty();
  }
  removeCost(i: number) {
    this.costs.removeAt(i);
    this.form.markAsDirty();
  }
  addAttachment() {
    this.attachments.push(this.attachmentGroup());
    this.form.markAsDirty();
  }
  removeAttachment(i: number) {
    this.attachments.removeAt(i);
    this.form.markAsDirty();
  }
  openPicker(area: number) {
    this.picker.reset({ search: '', material_id: 0, cantidad: 1 });
    this.pickerArea.set(area);
  }
  matches() {
    const q = this.picker.controls.search.value.toLowerCase();
    return this.materials().filter(
      (m) => m.activo && `${m.nombre} ${m.categoria} ${m.descripcion}`.toLowerCase().includes(q),
    );
  }
  selected() {
    return this.materials().find((m) => m.id === Number(this.picker.controls.material_id.value));
  }
  addMaterial() {
    this.picker.markAllAsTouched();
    if (this.picker.invalid) return;
    const m = this.selected();
    if (!m) return;
    const lines = this.lines(this.pickerArea()!);
    const quantity = Number(this.picker.controls.cantidad.value);
    const existing = lines.controls.find((l) => l.controls.material_id.value === m.id);
    if (existing) existing.controls.cantidad.setValue(existing.controls.cantidad.value + quantity);
    else
      lines.push(
        this.lineGroup({
          material_id: m.id,
          revision_id: m.revision_id,
          nombre: m.nombre,
          unidad: m.unidad,
          descripcion: m.descripcion,
          cantidad: quantity,
          especificaciones: m.especificaciones,
        }),
      );
    this.form.markAsDirty();
    this.pickerArea.set(null);
  }
  openSpecs(a: number, i: number) {
    this.specTarget.set({ area: a, line: i });
    const m = this.lines(a).at(i).getRawValue();
    this.specEditable.set(m.especificaciones_override !== null);
    this.specs.clear();
    (m.especificaciones_override ?? m.especificaciones).forEach((s) =>
      this.specs.push(this.specGroup(s)),
    );
    this.specForm.enable();
    if (!this.specEditable()) this.specForm.disable();
  }
  enableSpecs() {
    this.specEditable.set(true);
    this.specForm.enable();
  }
  addSpec() {
    this.specs.push(this.specGroup());
  }
  saveSpecs() {
    this.specForm.markAllAsTouched();
    if (this.specForm.invalid) return;
    const t = this.specTarget()!;
    this.lines(t.area)
      .at(t.line)
      .controls.especificaciones_override.setValue(this.specs.getRawValue());
    this.form.markAsDirty();
    this.specTarget.set(null);
  }
  resetSpecs() {
    const t = this.specTarget()!;
    this.lines(t.area).at(t.line).controls.especificaciones_override.setValue(null);
    this.form.markAsDirty();
    this.specTarget.set(null);
  }
  value(state: 'BORRADOR' | 'FINALIZADO' = 'BORRADOR'): Report {
    return {
      ...this.form.getRawValue(),
      id: this.id,
      version: this.version,
      codigo_completo: this.id ? this.code() : undefined,
      estado: state,
    };
  }
  go(step: number) {
    this.error.set('');
    this.step.set(step);
    if (step === 3) this.preview.set(this.value());
  }
  validation() {
    const errors: string[] = [];
    const v = this.value();
    if (!v.remitente.trim()) errors.push('Complete el remitente (De).');
    if (!v.destinatario.trim()) errors.push('Complete el destinatario (Para).');
    if (!v.referencia.trim()) errors.push('Complete la referencia.');
    if (!v.fecha) errors.push('Seleccione la fecha.');
    if (!v.areas.length) errors.push('Agregue al menos un área.');
    if (!v.areas.some((a) => a.materiales.length)) errors.push('Agregue al menos un material.');
    if (v.areas.some((a) => !a.nombre.trim())) errors.push('Escriba el nombre de cada área.');
    if (this.areas.invalid || this.costs.invalid || this.attachments.invalid)
      errors.push('Revise cantidades, costos y adjuntos: hay campos vacíos o valores inválidos.');
    return errors;
  }
  requestFinalize() {
    this.form.markAllAsTouched();
    const errors = this.validation();
    if (errors.length) {
      this.error.set(errors.join(' '));
      return;
    }
    this.finalConfirm.set(true);
  }
  save(finalize = false) {
    this.error.set('');
    this.success.set('');
    if (finalize && this.validation().length) {
      this.error.set(this.validation().join(' '));
      return;
    }
    const value = this.value(finalize ? 'FINALIZADO' : 'BORRADOR');
    if (!value.fecha) {
      this.error.set('Seleccione una fecha para asignar la gestión del informe.');
      return;
    }
    if (
      value.areas.some((a) => a.materiales.some((m) => !m.cantidad || m.cantidad <= 0)) ||
      this.costs.invalid ||
      this.attachments.invalid
    ) {
      this.form.markAllAsTouched();
      this.error.set('Revise cantidades, costos y adjuntos antes de guardar.');
      return;
    }
    this.busy.set(true);
    this.api.save(value).subscribe({
      next: (r) => {
        this.populate(r);
        this.busy.set(false);
        this.leaveBlocked.set(false);
        this.finalConfirm.set(false);
        this.success.set('Informe guardado en PostgreSQL.');
        if (finalize) void this.router.navigate(['/informes', r.id]);
        else if (this.route.snapshot.paramMap.get('id') === null)
          void this.router.navigate(['/informes', r.id, 'editar'], { replaceUrl: true });
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.busy.set(false);
        this.finalConfirm.set(false);
      },
    });
  }
  canLeave() {
    if (!this.form.dirty) return true;
    this.leaveBlocked.set(true);
    return false;
  }
  discard() {
    this.form.markAsPristine();
    void this.router.navigateByUrl('/informes');
  }
  back() {
    void this.router.navigateByUrl('/informes');
  }
  @HostListener('window:beforeunload', ['$event']) unload(event: BeforeUnloadEvent) {
    if (this.form.dirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  total() {
    return this.costs.getRawValue().reduce((s, c) => s + Number(c.monto), 0);
  }
}
