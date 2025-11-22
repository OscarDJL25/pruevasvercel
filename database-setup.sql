-- ================================================
-- CONFIGURACIÓN COMPLETA DE BASE DE DATOS CON JWT
-- ================================================

-- 1. CREAR TABLA USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. MODIFICAR TABLA TAREAS (agregar usuario_id)
-- Primero verificar si la columna no existe
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tareas' AND column_name = 'usuario_id'
    ) THEN
        ALTER TABLE tareas ADD COLUMN usuario_id INTEGER;
    END IF;
END $$;

-- 3. CREAR FOREIGN KEY CONSTRAINT
-- Eliminar constraint si existe para evitar errores
ALTER TABLE tareas DROP CONSTRAINT IF EXISTS fk_tareas_usuario_id;

-- Agregar la foreign key
ALTER TABLE tareas 
ADD CONSTRAINT fk_tareas_usuario_id 
FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;

-- 4. CREAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_tareas_usuario_id ON tareas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- 5. VERIFICAR ESTRUCTURA FINAL
-- Mostrar estructura de ambas tablas
\d usuarios;
\d tareas;

-- 6. DATOS DE EJEMPLO (opcional)
-- INSERT INTO usuarios (email, password_hash) VALUES 
-- ('test@example.com', '$2b$10$ejemplo...'),
-- ('admin@example.com', '$2b$10$ejemplo...');

COMMENT ON TABLE usuarios IS 'Tabla de usuarios con autenticación JWT';
COMMENT ON TABLE tareas IS 'Tabla de tareas asociadas a usuarios específicos';