# Prompt para Gemini - API REST con Sincronización Móvil

## Contexto del Proyecto

Eres un desarrollador experto en Node.js, Express, TypeScript, PostgreSQL y desarrollo móvil Android. Estoy trabajando en una API REST completa para una aplicación móvil de gestión de tareas con sistema de sincronización robusto.

## Arquitectura Actual

### Base de Datos PostgreSQL - Esquemas

**⚠️ IMPORTANTE**: Existen dos esquemas de base de datos que deben aplicarse en orden:

#### 1. Schema Base (database-setup.sql)
```sql
-- Tabla usuarios con updated_at como TIMESTAMP
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- TIMESTAMP
);

-- Tabla tareas inicial (SIN columnas de sync)
CREATE TABLE tareas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR NOT NULL,
    descripcion TEXT NOT NULL,
    fecha_asignacion DATE NOT NULL,
    hora_asignacion TIME NOT NULL,
    fecha_entrega DATE,
    hora_entrega TIME,
    finalizada BOOLEAN DEFAULT false,
    prioridad INTEGER DEFAULT 2, -- 1=baja, 2=media, 3=alta
    usuario_id INTEGER REFERENCES usuarios(id)
);
```

#### 2. Schema de Sincronización (database-sync-schema.sql)
```sql
-- EJECUTAR DESPUÉS del schema base
-- Añade columnas de sincronización a tabla tareas existente
ALTER TABLE tareas ADD COLUMN pending_sync BOOLEAN DEFAULT false;
ALTER TABLE tareas ADD COLUMN updated_at BIGINT;      -- BIGINT para Date.now()
ALTER TABLE tareas ADD COLUMN deleted BOOLEAN DEFAULT false;
ALTER TABLE tareas ADD COLUMN deleted_at TIMESTAMP;

-- Inicializar updated_at para registros existentes
UPDATE tareas SET updated_at = EXTRACT(EPOCH FROM NOW()) * 1000 WHERE updated_at IS NULL;
ALTER TABLE tareas ALTER COLUMN updated_at SET NOT NULL;
```

**Resultado Final de la Tabla `tareas`**:
```sql
CREATE TABLE tareas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR NOT NULL,
    descripcion TEXT NOT NULL,
    fecha_asignacion DATE NOT NULL,
    hora_asignacion TIME NOT NULL,
    fecha_entrega DATE,
    hora_entrega TIME,
    finalizada BOOLEAN DEFAULT false,
    prioridad INTEGER DEFAULT 2, -- 1=baja, 2=media, 3=alta
    usuario_id INTEGER REFERENCES usuarios(id),
    
    -- Columnas de sincronización móvil
    pending_sync BOOLEAN DEFAULT false,
    updated_at BIGINT NOT NULL,     -- ⚠️ BIGINT (ms) para tareas, TIMESTAMP para usuarios
    deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP
);
```

### Tecnologías
- **Backend**: Node.js + Express + TypeScript
- **Base de Datos**: PostgreSQL (Vercel Postgres)
- **Autenticación**: JWT (jsonwebtoken + bcrypt)
- **Conversión**: Automática camelCase ↔ snake_case
- **Deployment**: Vercel

## API Endpoints Implementados

### Autenticación
- `POST /register` - Registro de usuarios
- `POST /login` - Inicio de sesión (retorna JWT)

### Gestión de Tareas (Protegidos con JWT)
- `GET /tareas` - Obtener tareas no eliminadas del usuario
- `POST /tareas` - Crear nueva tarea (incluye campos sync)
- `PUT /tareas/:id` - Actualizar tarea (actualiza updated_at)
- `DELETE /tareas/:id` - Eliminación lógica (soft delete)

### **Sincronización Móvil** 🔄
- `POST /tareas/sync` - **Endpoint principal de sincronización**

### Utilidades
- `GET /db-status` - Estado de conexión a BD
- `GET /debug-schema` - Debug de esquema de tabla

## Endpoint de Sincronización Detallado

### POST `/tareas/sync`
**Funcionalidad**: Sincronización bidireccional con resolución de conflictos

**Request Body**: Array de tareas del cliente (camelCase)
```json
[
  {
    "idApi": null,                  // null = nueva, number = existente
    "nombre": "Mi tarea",
    "descripcion": "Descripción",
    "fechaAsignacion": "2025-11-29",
    "horaAsignacion": "14:30:00",
    "fechaEntrega": "2025-12-01",
    "horaEntrega": "18:00:00",
    "finalizada": false,
    "prioridad": "media",           // "baja"|"media"|"alta"
    "updatedAt": 1732892400000,     // Date.now()
    "deleted": false                // true para eliminar
  }
]
```

### Campos Exactos por Endpoint

#### GET `/tareas` - Response
```json
[
  {
    "id": 123,
    "nombre": "Mi tarea",
    "descripcion": "Descripción",
    "fechaAsignacion": "2025-11-29",     // DATE
    "horaAsignacion": "14:30:00",       // TIME
    "fechaEntrega": "2025-12-01",       // DATE | null
    "horaEntrega": "18:00:00",          // TIME | null
    "finalizada": false,                 // BOOLEAN
    "prioridad": 2,                      // INTEGER (1=baja, 2=media, 3=alta)
    "usuarioId": 1,                      // INTEGER
    "pendingSync": false,                // BOOLEAN
    "updatedAt": 1732892400000,          // BIGINT (Date.now())
    "deleted": false,                    // BOOLEAN (siempre false en GET)
    "deletedAt": null                    // TIMESTAMP | null (siempre null en GET)
  }
]
```

#### POST `/tareas` - Request Body
```json
{
  "nombre": "string",           // REQUERIDO
  "descripcion": "string",     // REQUERIDO
  "fechaAsignacion": "YYYY-MM-DD",  // Opcional (default: hoy)
  "horaAsignacion": "HH:mm:ss",     // Opcional (default: ahora)
  "fechaEntrega": "YYYY-MM-DD",     // Opcional
  "horaEntrega": "HH:mm:ss",        // Opcional
  "finalizada": boolean,             // Opcional (default: false)
  "prioridad": "baja"|"media"|"alta" | 1|2|3  // Opcional (default: 2)
}
```

#### POST `/tareas/sync` - Request Body
```json
[
  {
    "idApi": null | number,        // null=nueva, number=existente
    "nombre": "string",           // REQUERIDO para nuevas
    "descripcion": "string",     // REQUERIDO para nuevas
    "fechaAsignacion": "YYYY-MM-DD",
    "horaAsignacion": "HH:mm:ss",
    "fechaEntrega": "YYYY-MM-DD" | null,
    "horaEntrega": "HH:mm:ss" | null,
    "finalizada": boolean,
    "prioridad": "baja"|"media"|"alta" | 1|2|3,
    "updatedAt": number,           // REQUERIDO - Date.now()
    "deleted": boolean             // REQUERIDO - true para eliminar
  }
]
```
```json
{
  "updatedTasks": [
    {
      "id": 123,
      "nombre": "Mi tarea",
      "descripcion": "Descripción",
      "fechaAsignacion": "2025-11-29",
      "horaAsignacion": "14:30:00",
      "fechaEntrega": "2025-12-01", 
      "horaEntrega": "18:00:00",
      "finalizada": false,
      "prioridad": 2,
      "usuarioId": 1,
      "pendingSync": false,
      "updatedAt": 1732892400000,
      "deleted": false,
      "deletedAt": null
    }
  ],
  "conflicts": [
    {
      "taskId": 456,
      "clientVersion": { /* datos del cliente */ },
      "serverVersion": { /* datos del servidor */ },
      "conflictType": "UPDATE_CONFLICT"
    }
  ]
}
```

## Diferencias Críticas Entre Endpoints

### ⚠️ CUÁNDO USAR CADA ENDPOINT

#### Uso Individual vs Sincronización
```typescript
// ❌ NO usar para móvil - solo para testing/web
POST /tareas      // Crea UNA tarea individual
PUT /tareas/:id   // Actualiza UNA tarea individual  
DELETE /tareas/:id // Elimina UNA tarea individual

// ✅ USAR para móvil - sincronización masiva
POST /tareas/sync  // Sincroniza MÚLTIPLES tareas + conflictos
```

#### Comportamiento de updated_at
```typescript
// Endpoints individuales
POST /tareas     // updated_at = Date.now() (servidor decide)
PUT /tareas/:id  // updated_at = Date.now() (servidor decide)

// Endpoint de sincronización
POST /tareas/sync {
  // Para nuevas: updated_at = Date.now() (servidor decide)
  // Para existentes: updated_at = clientTimestamp (cliente decide si gana)
}
```

#### Manejo de Eliminaciones
```typescript
// Endpoint individual
DELETE /tareas/:id  // Soft delete inmediato + updated_at = Date.now()

// Endpoint de sincronización  
POST /tareas/sync   // Soft delete solo si "deleted": true en payload
```

### Resolución de Conflictos por Timestamps
**⚠️ SOLO aplica en POST `/tareas/sync`**

### Flujo Principal
1. **Tarea Nueva** (`idApi = null`):
   - Insertar en BD con `updated_at = Date.now()`
   - Retornar en `updatedTasks`

2. **Tarea Existente** (con `idApi`):
   - Si `deleted = true`: Soft delete (UPDATE `deleted = true`)
   - Si `deleted = false`: Comparar timestamps para resolución de conflictos

### Manejo de Prioridades

**⚠️ AMBIGÜEDAD RESUELTA**: La API maneja prioridades de forma dual:

#### Cliente → Servidor (Input)
- Cliente puede enviar: `"baja"` | `"media"` | `"alta"` (string)
- Cliente puede enviar: `1` | `2` | `3` (integer)
- **Conversión automática**: 
  ```typescript
  const prioridadMap = { 'baja': 1, 'media': 2, 'alta': 3 }
  const prioridadInt = typeof dbData.prioridad === 'string'
    ? prioridadMap[dbData.prioridad.toLowerCase()] || 2
    : dbData.prioridad || 2
  ```

#### Servidor → Cliente (Output)
- Base de datos almacena: `INTEGER` (1, 2, 3)
- API retorna: `INTEGER` (1, 2, 3) en camelCase
- Cliente debe interpretar: 1=baja, 2=media, 3=alta

#### Ejemplo en Sincronización
```json
// Cliente puede enviar:
{
  "prioridad": "alta"    // Se convierte a 3
}
// O también:
{
  "prioridad": 3         // Se mantiene como 3
}

// Servidor siempre responde:
{
  "prioridad": 3         // Siempre integer
}
```
```javascript
const clientTimestamp = tareaCliente.updatedAt
const serverTimestamp = parseInt(tareaServidor.updated_at)

if (clientTimestamp > serverTimestamp) {
    // CLIENTE GANA - Actualizar servidor
    // UPDATE tareas SET ... WHERE id = ... RETURNING *
    // Añadir a updatedTasks
} else if (serverTimestamp > clientTimestamp) {
    // SERVIDOR GANA - Registrar conflicto
    // Añadir a conflicts array
} else {
    // TIMESTAMPS IGUALES - No hacer nada
}
```

## Funciones de Utilidad Implementadas

### Conversión de Naming
```typescript
// camelCase ↔ snake_case automático
const objectToSnakeCase = (obj: any): any => { /* ... */ }
const objectToCamelCase = (obj: any): any => { /* ... */ }
```

### Middleware de Autenticación
```typescript
const authenticateToken = async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    // Verificar JWT Bearer token
    // Extraer userId y añadir a req.userId
}
```

### CORS para Android
```typescript
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
})
```

## Estructura del Proyecto
```
pruebasvercel/
├── src/
│   ├── index.ts              # ⚠️ ARCHIVO PRINCIPAL (TypeScript)
│   └── database-config.ts    # Configuración PostgreSQL
├── dist/
│   └── src/
│       └── index.js          # ⚠️ COMPILADO (JavaScript) - NO EDITAR
├── database-setup.sql        # Schema inicial (ejecutar PRIMERO)
├── database-sync-schema.sql  # Schema de sincronización (ejecutar SEGUNDO)
├── SYNC_DOCUMENTATION.md     # Documentación técnica
├── package.json             # Dependencias Node.js
├── tsconfig.json           # Configuración TypeScript
└── vercel.json            # Configuración deployment
```

**⚠️ IMPORTANTE**: 
- **EDITAR**: `src/index.ts` (TypeScript fuente)
- **NO EDITAR**: `dist/src/index.js` (compilado automático)
- **DEPLOYMENT**: Vercel usa el compilado en `dist/`

## Setup de Base de Datos - ORDEN CRÍTICO

### ⚠️ EJECUTAR EN ESTE ORDEN EXACTO:

```bash
# 1. PRIMERO - Setup inicial (crea tablas base)
psql -d tu_database < database-setup.sql

# 2. SEGUNDO - Añadir columnas de sincronización  
psql -d tu_database < database-sync-schema.sql
```

**❌ NO EJECUTAR** `database-sync-schema.sql` antes que `database-setup.sql`

### Variables de Entorno
```bash
# Database
POSTGRES_URL=postgresql://user:pass@host:port/dbname
DB_TYPE=vercel

# JWT  
JWT_SECRET=your-super-secret-jwt-key
```

## Características Clave del Sistema

### ✅ Implementado
- ✅ Autenticación JWT robusta
- ✅ CRUD completo de tareas
- ✅ Sincronización bidireccional móvil
- ✅ Resolución de conflictos por timestamps
- ✅ Soft delete (eliminación lógica)
- ✅ Conversión automática camelCase/snake_case
- ✅ Manejo de errores completo
- ✅ Logs detallados para debugging
- ✅ Soporte CORS para Android
- ✅ Validación de datos robusta

### 🎯 Patrones de Uso

**Para consultas**: Siempre menciona la conversión camelCase/snake_case
**Para modificaciones**: Considera el sistema de timestamps y conflictos
**Para nuevas funcionalidades**: Mantén consistencia con la arquitectura JWT + sync
**Para debugging**: Usa los logs con emojis implementados

## Ejemplos de Uso

### Crear nueva tarea desde móvil
```javascript
const nuevaTarea = {
    idApi: null,
    nombre: "Comprar leche",
    descripcion: "Ir al supermercado",
    fechaAsignacion: "2025-11-29",
    horaAsignacion: "10:00:00",
    prioridad: "alta",
    updatedAt: Date.now(),
    deleted: false
}

const response = await syncTareas([nuevaTarea])
```

### Manejar conflictos en Android
```kotlin
// En la app Android
response.conflicts.forEach { conflict ->
    when (conflict.conflictType) {
        "UPDATE_CONFLICT" -> showConflictDialog(
            conflict.clientVersion,
            conflict.serverVersion
        )
    }
}
```

## Instrucciones para Gemini

Cuando hagas sugerencias o modifiques código:

1. **Mantén la consistencia** con el sistema de timestamps y JWT
2. **Respeta las conversiones** camelCase ↔ snake_case
3. **Considera la sincronización móvil** en todas las operaciones
4. **Usa los patrones de logging** con emojis existentes
5. **Valida la autenticación** en endpoints protegidos
6. **Maneja errores** con try...catch consistentes
7. **Actualiza updated_at** en modificaciones de datos

La API está optimizada para uso móvil con sincronización offline y resolución de conflictos automática.