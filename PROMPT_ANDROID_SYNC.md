# Prompt para Gemini - Cliente Android Sincronización

## Contexto del Proyecto

Eres un desarrollador experto en Android/Kotlin trabajando en una aplicación móvil de gestión de tareas con sincronización offline. Necesitas implementar el manejo correcto de IDs de sincronización entre cliente local y servidor remoto.

## Arquitectura de Sincronización

### Estados de Tareas y IDs

#### Variables Críticas en Modelo de Datos
```kotlin
data class Task(
    var idLocal: Long? = null,     // ID temporal local (solo mientras no existe en servidor)
    var idApi: Long? = null,       // ID permanente del servidor (una vez sincronizado)
    var nombre: String,
    var descripcion: String,
    var fechaAsignacion: String = "",
    var horaAsignacion: String = "",
    var fechaEntrega: String? = null,
    var horaEntrega: String? = null,
    var finalizada: Boolean = false,
    var prioridad: Int = 1,        // 1=baja, 2=media, 3=alta
    var updatedAt: Long = System.currentTimeMillis(),
    var deleted: Boolean = false,
    var deletedAt: Long? = null,
    var pendingSync: Boolean = true  // Marcador para sincronización pendiente
)
```

### Estados de una Tarea en el Ciclo de Vida

#### Estado 1: Tarea Nueva Local
```kotlin
// ✅ NUEVA tarea creada localmente
Task(
    idLocal = generateLocalId(),    // Ej: 123 (único local)
    idApi = null,                  // ❌ AÚN NO existe en servidor
    nombre = "Mi tarea nueva",
    pendingSync = true             // ✅ REQUIERE sincronización
)
```

#### Estado 2: Enviando al Servidor
```kotlin
// ✅ Payload para POST /tareas/sync
{
    "idApi": null,                 // ❌ Nueva tarea
    "nombre": "Mi tarea nueva",
    "descripcion": "...",
    "updatedAt": 1732892400000,
    "deleted": false
}
```

#### Estado 3: Respuesta del Servidor
```kotlin
// ✅ Servidor responde con ID asignado
{
    "updatedTasks": [
        {
            "id": 75,              // ✅ ESTE es el idApi que necesitas
            "nombre": "Mi tarea nueva",
            "updatedAt": 1732892400050
        }
    ]
}
```

#### Estado 4: Actualizar Tarea Local
```kotlin
// ✅ CRÍTICO: Actualizar tarea local con idApi del servidor
task.idApi = serverResponse.id     // 75
task.idLocal = null               // Opcional: limpiar ID temporal
task.pendingSync = false          // ✅ Sincronizada exitosamente
task.updatedAt = serverResponse.updatedAt
```

## Implementación Correcta de Sincronización

### 1. Función de Sincronización Principal

```kotlin
suspend fun syncTasks() {
    try {
        // 1. Obtener tareas pendientes de sincronización
        val pendingTasks = taskRepository.getPendingSyncTasks()
        
        // 2. Preparar payload para servidor
        val syncPayload = pendingTasks.map { task ->
            TaskSyncData(
                idApi = task.idApi,           // null para nuevas, Long para existentes
                nombre = task.nombre,
                descripcion = task.descripcion,
                fechaAsignacion = task.fechaAsignacion.takeIf { it.isNotEmpty() } ?: "",
                horaAsignacion = task.horaAsignacion.takeIf { it.isNotEmpty() } ?: "",
                fechaEntrega = task.fechaEntrega,
                horaEntrega = task.horaEntrega,
                finalizada = task.finalizada,
                prioridad = task.prioridad,
                updatedAt = task.updatedAt,
                deleted = task.deleted
            )
        }
        
        // 3. Enviar al servidor
        val response = apiService.syncTasks(syncPayload)
        
        // 4. ✅ CRÍTICO: Procesar respuesta y actualizar IDs
        processServerResponse(response, pendingTasks)
        
    } catch (e: Exception) {
        Log.e("SYNC", "Error en sincronización: ${e.message}")
    }
}
```

### 2. Procesamiento de Respuesta del Servidor

```kotlin
private suspend fun processServerResponse(
    response: SyncResponse,
    originalTasks: List<Task>
) {
    // ✅ Procesar tareas actualizadas/creadas por el servidor
    response.updatedTasks.forEach { serverTask ->
        
        // Buscar tarea local original que generó esta respuesta
        val originalTask = findOriginalTask(originalTasks, serverTask)
        
        if (originalTask != null) {
            // ✅ ACTUALIZACIÓN CRÍTICA: Asignar idApi del servidor
            originalTask.apply {
                idApi = serverTask.id                    // ✅ ID del servidor
                idLocal = null                           // Opcional: limpiar
                pendingSync = false                      // ✅ Ya sincronizada
                updatedAt = serverTask.updatedAt.toLong()
                
                // Actualizar otros campos si es necesario
                if (serverTask.fechaAsignacion != "{}") {
                    fechaAsignacion = serverTask.fechaAsignacion
                }
                horaAsignacion = serverTask.horaAsignacion
            }
            
            // ✅ Guardar en base de datos local
            taskRepository.updateTask(originalTask)
            
            Log.d("SYNC", "✅ Tarea actualizada: ${originalTask.nombre} -> idApi: ${originalTask.idApi}")
        }
    }
    
    // ⚠️ Procesar conflictos si existen
    response.conflicts.forEach { conflict ->
        handleConflict(conflict)
    }
}
```

### 3. Función para Encontrar Tarea Original

```kotlin
private fun findOriginalTask(
    originalTasks: List<Task>,
    serverTask: ServerTask
): Task? {
    return originalTasks.find { originalTask ->
        // Para tareas nuevas: buscar por nombre y descripción
        if (originalTask.idApi == null) {
            originalTask.nombre == serverTask.nombre && 
            originalTask.descripcion == serverTask.descripcion
        } else {
            // Para tareas existentes: buscar por idApi
            originalTask.idApi == serverTask.id
        }
    }
}
```

## Casos de Uso Específicos

### ✅ CREAR Nueva Tarea

```kotlin
fun createNewTask(nombre: String, descripcion: String) {
    val newTask = Task(
        idLocal = System.currentTimeMillis(),  // ID temporal único
        idApi = null,                         // ❌ Aún no existe en servidor
        nombre = nombre,
        descripcion = descripcion,
        pendingSync = true                    // ✅ Requiere sync
    )
    
    // Guardar localmente
    taskRepository.insertTask(newTask)
    
    // Programar sincronización
    scheduleSyncIfNeeded()
}
```

### ✅ ELIMINAR Tarea Existente

```kotlin
fun deleteTask(task: Task) {
    if (task.idApi != null) {
        // ✅ Tarea existe en servidor - marcar para eliminación
        task.apply {
            deleted = true
            deletedAt = System.currentTimeMillis()
            updatedAt = System.currentTimeMillis()
            pendingSync = true
        }
        
        taskRepository.updateTask(task)
        scheduleSyncIfNeeded()
        
    } else {
        // ✅ Tarea solo local - eliminar directamente
        taskRepository.deleteTask(task.idLocal!!)
    }
}
```

### ✅ ACTUALIZAR Tarea Existente

```kotlin
fun updateTask(task: Task) {
    task.apply {
        updatedAt = System.currentTimeMillis()
        pendingSync = true  // ✅ Marcar para sincronización
    }
    
    taskRepository.updateTask(task)
    scheduleSyncIfNeeded()
}
```

## Base de Datos Local (Room)

### Entity Definition
```kotlin
@Entity(tableName = "tasks")
data class TaskEntity(
    @PrimaryKey(autoGenerate = true)
    val idLocal: Long = 0,
    
    val idApi: Long? = null,              // ✅ ID del servidor
    val nombre: String,
    val descripcion: String,
    val fechaAsignacion: String = "",
    val horaAsignacion: String = "",
    val fechaEntrega: String? = null,
    val horaEntrega: String? = null,
    val finalizada: Boolean = false,
    val prioridad: Int = 1,
    val updatedAt: Long = System.currentTimeMillis(),
    val deleted: Boolean = false,
    val deletedAt: Long? = null,
    val pendingSync: Boolean = true
)

@Dao
interface TaskDao {
    @Query("SELECT * FROM tasks WHERE pending_sync = 1 AND deleted = 0")
    suspend fun getPendingSyncTasks(): List<TaskEntity>
    
    @Query("SELECT * FROM tasks WHERE deleted = 0 ORDER BY updatedAt DESC")
    suspend fun getAllActiveTasks(): List<TaskEntity>
    
    @Insert
    suspend fun insertTask(task: TaskEntity): Long
    
    @Update
    suspend fun updateTask(task: TaskEntity)
}
```

## Logs de Debug Recomendados

```kotlin
class SyncManager {
    companion object {
        private const val TAG = "SYNC_MANAGER"
    }
    
    fun logTaskState(task: Task, operation: String) {
        Log.d(TAG, """
            🔄 $operation - Tarea: ${task.nombre}
            📍 idLocal: ${task.idLocal}
            🌐 idApi: ${task.idApi}
            ⏰ updatedAt: ${task.updatedAt}
            🔄 pendingSync: ${task.pendingSync}
            🗑️ deleted: ${task.deleted}
        """.trimIndent())
    }
}
```

## Flujo de Validación

### ✅ Antes de Eliminar
```kotlin
fun validateBeforeDelete(task: Task): Boolean {
    return when {
        task.idApi != null -> {
            Log.d("DELETE", "✅ Tarea tiene idApi: ${task.idApi} - Se puede eliminar del servidor")
            true
        }
        task.idLocal != null && task.idApi == null -> {
            Log.d("DELETE", "⚠️ Tarea solo local: ${task.idLocal} - Eliminar solo localmente")
            true
        }
        else -> {
            Log.e("DELETE", "❌ Tarea sin IDs válidos")
            false
        }
    }
}
```

### ✅ Verificación de Estado Post-Sync
```kotlin
fun verifyPostSyncState(tasks: List<Task>) {
    tasks.forEach { task ->
        when {
            task.idApi != null && !task.pendingSync -> {
                Log.d("VERIFY", "✅ Tarea sincronizada: ${task.nombre} (idApi: ${task.idApi})")
            }
            task.idApi == null && task.pendingSync -> {
                Log.w("VERIFY", "⚠️ Tarea pendiente: ${task.nombre} (idLocal: ${task.idLocal})")
            }
            task.idApi != null && task.pendingSync -> {
                Log.w("VERIFY", "🔄 Tarea con cambios pendientes: ${task.nombre}")
            }
            else -> {
                Log.e("VERIFY", "❌ Estado inconsistente: ${task.nombre}")
            }
        }
    }
}
```

## Instrucciones para Gemini

Al implementar funcionalidades de sincronización:

1. **Siempre distingue** entre `idLocal` (temporal) e `idApi` (servidor permanente)
2. **Actualiza `idApi`** después de cada respuesta exitosa del servidor
3. **Marca `pendingSync = false`** solo después de sincronización exitosa
4. **Valida IDs** antes de operaciones de eliminación o actualización
5. **Usa logs detallados** para debugging de estados de sincronización
6. **Maneja casos edge** como tareas solo locales vs tareas del servidor
7. **Implementa retry logic** para fallos de sincronización

El objetivo es mantener consistencia entre cliente local y servidor, evitando duplicaciones y pérdida de datos.