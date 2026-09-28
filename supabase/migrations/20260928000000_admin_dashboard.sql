-- Tabla de administradores
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin', -- 'admin' o 'super_admin'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para admins
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo el usuario puede ver su propio admin record"
  ON admins FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IN (SELECT user_id FROM admins WHERE role = 'super_admin'));

CREATE POLICY "Super admin puede insertar admins"
  ON admins FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM admins WHERE role = 'super_admin'));

-- Índices
CREATE INDEX idx_admins_user_id ON admins(user_id);
CREATE INDEX idx_admins_email ON admins(email);
