export interface User {
  id: number;
  usuario: string;
  nombre: string;
  correo: string;
  cargo: string;
  rol: 'ADMINISTRADOR' | 'TECNICO' | 'JEFE';
  activo: boolean;
  debe_cambiar_password: boolean;
}
export interface Spec {
  nombre: string;
  valor: string;
}
export interface Material {
  id: number;
  nombre: string;
  unidad: string;
  categoria: string;
  descripcion: string;
  activo: boolean;
  revision_id: number;
  especificaciones: Spec[];
}
export interface Line {
  material_id: number;
  revision_id?: number;
  nombre: string;
  unidad: string;
  descripcion?: string;
  cantidad: number;
  especificaciones: Spec[];
  especificaciones_override?: Spec[] | null;
}
export interface Area {
  nombre: string;
  destino: string;
  uso: string;
  materiales: Line[];
}
export interface Report {
  id?: number;
  numero?: number;
  gestion?: number;
  codigo_completo?: string;
  usuario_id?: number;
  version?: number;
  remitente: string;
  cargo_remitente: string;
  destinatario: string;
  cargo_destinatario: string;
  referencia: string;
  fecha: string;
  nota_solicitud: string;
  unidad_solicitante: string;
  introduccion: string;
  conclusion: string;
  estado: 'BORRADOR' | 'FINALIZADO';
  areas: Area[];
  costos: { descripcion: string; monto: number }[];
  adjuntos: string[];
  historial?: { accion: string; nombre: string; fecha: string }[];
}
export type Defaults = Pick<
  Report,
  | 'remitente'
  | 'cargo_remitente'
  | 'destinatario'
  | 'cargo_destinatario'
  | 'introduccion'
  | 'conclusion'
>;
