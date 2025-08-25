-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS reg_usuarios (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de tokens de sesión
CREATE TABLE IF NOT EXISTS reg_usuarios_tokens (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES reg_usuarios(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_reg_usuarios_username ON reg_usuarios(username);
CREATE INDEX IF NOT EXISTS idx_reg_usuarios_email ON reg_usuarios(email);
CREATE INDEX IF NOT EXISTS idx_reg_usuarios_tokens_token ON reg_usuarios_tokens(token);
CREATE INDEX IF NOT EXISTS idx_reg_usuarios_tokens_expires ON reg_usuarios_tokens(expires_at);

-- Insertar usuario administrador por defecto
INSERT INTO reg_usuarios (username, email, password_hash, nombre, apellido, role, activo)
VALUES ('admin', 'admin@financeapp.com', '$2b$10$8K1p/aE8Yc8Q8K1p/aE8Yc8Q8K1p/aE8Yc8Q8K1p/aE8Yc8Q8K1p/', 'Admin', 'User', 'admin', true)
ON CONFLICT (username) DO NOTHING;