# Documentación de Sincronización Móvil - API Tareas

## Resumen de Cambios Implementados

Se ha implementado un sistema de sincronización robusto para la aplicación móvil Android que incluye:

1. **Nuevas columnas en la base de datos** para soporte de sincronización
2. **Endpoint de sincronización** POST `/tareas/sync` con resolución de conflictos
3. **Modificaciones a endpoints existentes** para soportar eliminación lógica
4. **Manejo de timestamps** para resolución de conflictos

## 1. Cambios en la Base de Datos

### Nuevas Columnas Añadidas

Ejecuta el archivo `database-sync-schema.sql` en tu base de datos PostgreSQL:

```sql
-- Columnas de sincronización
ALTER TABLE tareas ADD COLUMN pending_sync BOOLEAN DEFAULT false;
ALTER TABLE tareas ADD COLUMN updated_at BIGINT;
ALTER TABLE tareas ADD COLUMN deleted BOOLEAN DEFAULT false;
ALTER TABLE tareas ADD COLUMN deleted_at TIMESTAMP;

-- Inicializar timestamps existentes
UPDATE tareas SET updated_at = EXTRACT(EPOCH FROM NOW()) * 1000 WHERE updated_at IS NULL;
ALTER TABLE tareas ALTER COLUMN updated_at SET NOT NULL;

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_tareas_deleted ON tareas(deleted);
CREATE INDEX IF NOT EXISTS idx_tareas_updated_at ON tareas(updated_at);
CREATE INDEX IF NOT EXISTS idx_tareas_pending_sync ON tareas(pending_sync);
```

### Descripción de Columnas

- **`pending_sync`**: Indica si la tarea tiene cambios pendientes de sincronizar
- **`updated_at`**: Timestamp en milisegundos (Date.now()) para resolución de conflictos
- **`deleted`**: Marca de eliminación lógica (soft delete)
- **`deleted_at`**: Timestamp de cuándo se eliminó la tarea

## 2. Endpoint de Sincronización

### POST `/tareas/sync`

**Autenticación**: Bearer Token requerido

**Request Body**: Array de tareas en camelCase del cliente
```json
[
  {
    "idApi": null,           // null para tareas nuevas, number para existentes
    "nombre": "Mi tarea",
    "descripcion": "Descripción",
    "fechaAsignacion": "2024-01-15",
    "horaAsignacion": "10:00:00",
    "fechaEntrega": "2024-01-20",
    "horaEntrega": "15:00:00",
    "finalizada": false,
    "prioridad": "media",
    "updatedAt": 1706167200000,  // Date.now()
    "deleted": false
  }
]
```

**Response**: Objeto con tareas actualizadas y conflictos
```json
{
  "updatedTasks": [
    {
      "id": 123,
      "nombre": "Mi tarea",
      "descripcion": "Descripción",
      // ... resto de campos en camelCase
      "updatedAt": 1706167200000
    }
  ],
  "conflicts": [
    {
      "taskId": 456,
      "clientVersion": { /* versión del cliente */ },
      "serverVersion": { /* versión del servidor */ },
      "conflictType": "UPDATE_CONFLICT"
    }
  ]
}
```

### Lógica de Sincronización

#### Caso A: Tarea Nueva (idApi = null)
1. Convierte datos de camelCase a snake_case
2. Asigna valores por defecto
3. Inserta en la base de datos con `updated_at = Date.now()`
4. Retorna la nueva tarea en `updatedTasks`

#### Caso B: Tarea Existente (idApi presente)

**Para eliminaciones (deleted = true)**:
- Ejecuta UPDATE con `deleted = true` y `deleted_at = NOW()`
- No retorna nada (eliminación silenciosa)

**Para actualizaciones (deleted = false)**:
- Compara timestamps: `clientTimestamp` vs `serverTimestamp`
- **Cliente gana** (clientTimestamp > serverTimestamp):
  - Actualiza servidor con datos del cliente
  - Retorna tarea actualizada en `updatedTasks`
- **Servidor gana** (serverTimestamp > clientTimestamp):
  - Crea conflicto en array `conflicts`
  - Cliente debe decidir cómo resolver
- **Timestamps iguales**: No hace nada

## 3. Cambios en Endpoints Existentes

### GET `/tareas`
- **Antes**: `WHERE usuario_id = $1`
- **Ahora**: `WHERE usuario_id = $1 AND deleted = false`
- Solo retorna tareas no eliminadas lógicamente

### POST `/tareas`
- Incluye nuevos campos en INSERT:
  - `pending_sync = false`
  - `updated_at = Date.now()`
  - `deleted = false`
  - `deleted_at = null`

### PUT `/tareas/:id`
- **Antes**: Solo validaba `usuario_id`
- **Ahora**: Valida `usuario_id AND deleted = false`
- Actualiza `updated_at = Date.now()` en cada modificación

### DELETE `/tareas/:id`
- **Antes**: `DELETE FROM tareas WHERE...` (eliminación física)
- **Ahora**: `UPDATE tareas SET deleted = true, deleted_at = NOW(), updated_at = Date.now()`
- Eliminación lógica (soft delete)

## 4. Resolución de Conflictos

### Estrategia de Timestamps
- Cada operación actualiza `updated_at` con `Date.now()`
- La versión con timestamp más reciente "gana"
- Conflictos se reportan al cliente para resolución manual

### Tipos de Conflictos
- **`UPDATE_CONFLICT`**: Servidor tiene versión más reciente que el cliente

### Ejemplo de Manejo en Cliente Android
```kotlin
// Procesar respuesta de sincronización
val response = syncAPI.syncTasks(localTasks)

// Actualizar tareas locales
response.updatedTasks.forEach { task ->
    localDatabase.updateTask(task)
}

// Manejar conflictos
response.conflicts.forEach { conflict ->
    when (conflict.conflictType) {
        "UPDATE_CONFLICT" -> {
            // Mostrar diálogo al usuario
            showConflictResolutionDialog(
                conflict.clientVersion,
                conflict.serverVersion
            )
        }
    }
}
```

## 5. Flujo de Sincronización Recomendado

1. **Al abrir la app**: Llamar a `/tareas/sync` con todas las tareas locales
2. **Después de cambios locales**: Marcar `pending_sync = true`
3. **Sincronización periódica**: Enviar solo tareas con `pending_sync = true`
4. **Manejar conflictos**: Permitir al usuario elegir versión a mantener
5. **Actualizar local**: Aplicar cambios de `updatedTasks` a la base local

## 6. Consideraciones de Rendimiento

- Usar índices en `deleted`, `updated_at` y `pending_sync`
- Sincronizar solo tareas modificadas cuando sea posible
- Implementar paginación para grandes volúmenes de datos
- Cache local con validación de timestamps

## 7. Testing

### Casos de Prueba Recomendados
1. Crear nueva tarea desde móvil
2. Actualizar tarea existente (cliente gana)
3. Actualizar tarea con conflicto (servidor gana)
4. Eliminar tarea lógicamente
5. Sincronizar múltiples tareas simultáneamente
6. Manejar errores de conectividad

### Ejemplo de Test
```javascript
// Crear tarea nueva
const newTask = {
  idApi: null,
  nombre: "Test Task",
  descripcion: "Test Description",
  updatedAt: Date.now(),
  deleted: false
}

const response = await fetch('/tareas/sync', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify([newTask])
})

const { updatedTasks, conflicts } = await response.json()
console.log('Nueva tarea creada:', updatedTasks[0].id)
```

## 8. Logs y Debugging

El endpoint incluye logs detallados:
- 🔄 Inicio de sincronización
- ➕ Creación de nuevas tareas
- 🔄 Procesamiento de actualizaciones
- 🗑️ Eliminaciones lógicas
- ⏰ Comparación de timestamps
- 📤📥 Resolución de conflictos
- ✅ Resumen de sincronización

Busca estos emojis en los logs para rastrear el flujo de sincronización.