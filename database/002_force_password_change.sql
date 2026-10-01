ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS debe_cambiar_password boolean NOT NULL DEFAULT false;

-- The existing administrator may still have the bootstrap password.
UPDATE usuarios SET debe_cambiar_password = true WHERE usuario = 'admin';
