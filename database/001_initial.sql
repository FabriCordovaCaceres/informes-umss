CREATE TABLE IF NOT EXISTS roles (id serial PRIMARY KEY, nombre text NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS usuarios (
 id serial PRIMARY KEY, usuario text NOT NULL UNIQUE, nombre text NOT NULL, correo text NOT NULL UNIQUE,
 password_hash text NOT NULL, cargo text NOT NULL, rol_id integer NOT NULL REFERENCES roles,
 activo boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sesiones (token_hash text PRIMARY KEY, usuario_id integer NOT NULL REFERENCES usuarios ON DELETE CASCADE, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS materiales (id serial PRIMARY KEY, nombre text NOT NULL, unidad text NOT NULL, categoria text NOT NULL, descripcion text NOT NULL DEFAULT '', activo boolean NOT NULL DEFAULT true, revision_id integer);
CREATE TABLE IF NOT EXISTS material_revisiones (id serial PRIMARY KEY, material_id integer NOT NULL REFERENCES materiales, nombre text NOT NULL, unidad text NOT NULL, descripcion text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS especificaciones_material (id serial PRIMARY KEY, material_id integer NOT NULL REFERENCES materiales, revision_id integer NOT NULL REFERENCES material_revisiones, nombre text NOT NULL, valor text NOT NULL, orden integer NOT NULL);
CREATE TABLE IF NOT EXISTS numeracion_informes (gestion integer PRIMARY KEY, ultimo integer NOT NULL);
CREATE TABLE IF NOT EXISTS informes (
 id serial PRIMARY KEY, numero integer NOT NULL, gestion integer NOT NULL, codigo_completo text NOT NULL UNIQUE,
 usuario_id integer NOT NULL REFERENCES usuarios, remitente text NOT NULL DEFAULT '', cargo_remitente text NOT NULL DEFAULT '', destinatario text NOT NULL DEFAULT '', cargo_destinatario text NOT NULL DEFAULT '',
 referencia text NOT NULL DEFAULT '', fecha date NOT NULL, nota_solicitud text NOT NULL DEFAULT '', unidad_solicitante text NOT NULL DEFAULT '', introduccion text NOT NULL DEFAULT '', conclusion text NOT NULL DEFAULT '',
 estado text NOT NULL DEFAULT 'BORRADOR' CHECK (estado IN ('BORRADOR','FINALIZADO')), version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(gestion,numero)
);
CREATE TABLE IF NOT EXISTS areas_informe (id serial PRIMARY KEY, informe_id integer NOT NULL REFERENCES informes ON DELETE CASCADE, nombre text NOT NULL, destino text NOT NULL DEFAULT '', uso text NOT NULL DEFAULT '', orden integer NOT NULL);
CREATE TABLE IF NOT EXISTS materiales_area (id serial PRIMARY KEY, area_id integer NOT NULL REFERENCES areas_informe ON DELETE CASCADE, material_id integer NOT NULL REFERENCES materiales, revision_id integer NOT NULL REFERENCES material_revisiones, cantidad numeric(12,3) NOT NULL CHECK(cantidad>0), especificaciones_override jsonb, orden integer NOT NULL, UNIQUE(area_id,material_id));
CREATE TABLE IF NOT EXISTS costos_informe (id serial PRIMARY KEY, informe_id integer NOT NULL REFERENCES informes ON DELETE CASCADE, descripcion text NOT NULL, monto numeric(14,2) NOT NULL CHECK(monto>=0), orden integer NOT NULL);
CREATE TABLE IF NOT EXISTS adjuntos (id serial PRIMARY KEY, informe_id integer NOT NULL REFERENCES informes ON DELETE CASCADE, descripcion text NOT NULL, orden integer NOT NULL);
CREATE TABLE IF NOT EXISTS historial_informe (id serial PRIMARY KEY, informe_id integer NOT NULL REFERENCES informes ON DELETE CASCADE, usuario_id integer NOT NULL REFERENCES usuarios, accion text NOT NULL, fecha timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS configuracion (id integer PRIMARY KEY CHECK(id=1), datos jsonb NOT NULL);
CREATE INDEX IF NOT EXISTS areas_informe_idx ON areas_informe(informe_id);
CREATE INDEX IF NOT EXISTS informes_usuario_idx ON informes(usuario_id);
CREATE INDEX IF NOT EXISTS especificaciones_revision_idx ON especificaciones_material(revision_id);
