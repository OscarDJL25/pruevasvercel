# 🔐 API REST con Autenticación JWT - Documentación Completa

## 🎯 **IMPLEMENTACIÓN EXITOSA**

Tu API ahora tiene **autenticación completa con JWT**. Cada usuario solo puede ver y gestionar sus propias tareas.

### ✅ **Estado de Implementación:**

- 🔐 **Autenticación JWT:** ✅ Implementada
- 👥 **Tabla usuarios:** ✅ Creada en PostgreSQL  
- 🔗 **Foreign Key:** ✅ tareas.usuario_id → usuarios.id
- 🛡️ **Endpoints protegidos:** ✅ Todos los CRUD requieren token
- 🔒 **Seguridad:** ✅ bcrypt + JWT con verificación

---

## 🌐 **ENDPOINTS DISPONIBLES**

### 🔓 **Autenticación (Públicos):**

#### **POST /register**
Registrar nuevo usuario
```bash
curl -X POST https://pruevasvercel.vercel.app/register \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@ejemplo.com","password":"123456"}'
```
**Respuesta:**
```json
{
  "message": "Usuario registrado exitosamente",
  "user": {
    "id": 1,
    "email": "usuario@ejemplo.com",
    "created_at": "2025-11-22T21:59:26.635Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### **POST /login**
Iniciar sesión
```bash
curl -X POST https://pruevasvercel.vercel.app/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@ejemplo.com","password":"123456"}'
```
**Respuesta:**
```json
{
  "message": "Login exitoso",
  "user": {
    "id": 1,
    "email": "usuario@ejemplo.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 🔒 **Tareas (Requieren Token):**

**Header requerido:** `Authorization: Bearer <token>`

#### **GET /tareas**
```bash
curl -H "Authorization: Bearer <token>" \
  https://pruevasvercel.vercel.app/tareas
```

#### **POST /tareas**
```bash
curl -X POST https://pruevasvercel.vercel.app/tareas \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Nueva tarea","descripcion":"Descripción"}'
```

#### **PUT /tareas/:id**
```bash
curl -X PUT https://pruevasvercel.vercel.app/tareas/8 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Tarea actualizada","descripcion":"Nueva descripción"}'
```

#### **DELETE /tareas/:id**
```bash
curl -X DELETE https://pruevasvercel.vercel.app/tareas/8 \
  -H "Authorization: Bearer <token>"
```

---

## 📱 **CONFIGURACIÓN ANDROID**

### **1. Agregar dependencias:**
```kotlin
// En build.gradle (app)
implementation 'com.squareup.retrofit2:retrofit:2.9.0'
implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
implementation 'com.squareup.okhttp3:logging-interceptor:4.9.0'
```

### **2. Data Classes:**
```kotlin
data class Usuario(
    val id: Int? = null,
    val email: String,
    val created_at: String? = null
)

data class LoginRequest(
    val email: String,
    val password: String
)

data class LoginResponse(
    val message: String,
    val user: Usuario,
    val token: String
)

data class Tarea(
    val id: Int? = null,
    val nombre: String,
    val descripcion: String,
    val fecha_asignacion: String? = null,
    val hora_asignacion: String? = null,
    val fecha_entrega: String? = null,
    val hora_entrega: String? = null,
    val finalizada: Boolean = false,
    val prioridad: Int? = null,
    val usuario_id: Int? = null
)
```

### **3. ApiService:**
```kotlin
interface ApiService {
    // Autenticación
    @POST("register")
    suspend fun register(@Body request: LoginRequest): LoginResponse
    
    @POST("login")
    suspend fun login(@Body request: LoginRequest): LoginResponse
    
    // Tareas (requieren token)
    @GET("tareas")
    suspend fun getTareas(@Header("Authorization") token: String): List<Tarea>
    
    @POST("tareas")
    suspend fun createTarea(
        @Header("Authorization") token: String,
        @Body tarea: Tarea
    ): Tarea
    
    @PUT("tareas/{id}")
    suspend fun updateTarea(
        @Path("id") id: Int,
        @Header("Authorization") token: String,
        @Body tarea: Tarea
    ): Tarea
    
    @DELETE("tareas/{id}")
    suspend fun deleteTarea(
        @Path("id") id: Int,
        @Header("Authorization") token: String
    ): Unit
}
```

### **4. RetrofitClient actualizado:**
```kotlin
object RetrofitClient {
    private const val BASE_URL = "https://pruevasvercel.vercel.app/"
    
    val api: ApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}
```

### **5. AuthRepository:**
```kotlin
class AuthRepository {
    private val api = RetrofitClient.api
    
    suspend fun login(email: String, password: String): Result<LoginResponse> {
        return try {
            val response = api.login(LoginRequest(email, password))
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun register(email: String, password: String): Result<LoginResponse> {
        return try {
            val response = api.register(LoginRequest(email, password))
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

### **6. TaskRepository:**
```kotlin
class TaskRepository {
    private val api = RetrofitClient.api
    
    suspend fun getTareas(token: String): Result<List<Tarea>> {
        return try {
            val tareas = api.getTareas("Bearer $token")
            Result.success(tareas)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun createTarea(token: String, tarea: Tarea): Result<Tarea> {
        return try {
            val nuevaTarea = api.createTarea("Bearer $token", tarea)
            Result.success(nuevaTarea)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    // ... más métodos CRUD
}
```

---

## 🔐 **SEGURIDAD IMPLEMENTADA**

### **Contraseñas:**
- ✅ Hasheadas con **bcrypt** (10 rounds)
- ✅ Nunca almacenadas en texto plano
- ✅ Validación mínima 6 caracteres

### **JWT Tokens:**
- ✅ Firmados con secret seguro
- ✅ Expiración: 7 días
- ✅ Payload: `{ userId, email }`
- ✅ Verificación automática en endpoints

### **Base de Datos:**
- ✅ Foreign keys con CASCADE
- ✅ Índices para performance
- ✅ Filtros por usuario_id en todas las consultas

### **Autorización:**
- ✅ Middleware `authenticateToken` en todos los CRUD
- ✅ Verificación de propiedad antes de UPDATE/DELETE
- ✅ Respuestas 401/403 para acceso no autorizado

---

## 🧪 **TESTING COMPLETO VERIFICADO**

### ✅ **Flujo Completo Probado:**
1. **Registro:** ✅ Usuario creado con ID 1
2. **Login:** ✅ Token JWT generado
3. **Crear Tarea:** ✅ Tarea con usuario_id = 1
4. **Obtener Tareas:** ✅ Solo tareas del usuario autenticado
5. **Seguridad:** ✅ Sin token = 401, token inválido = 403

### 🔒 **Aislamiento por Usuario:**
- ✅ Cada usuario ve solo sus tareas
- ✅ No puede modificar tareas de otros
- ✅ Foreign key mantiene integridad

---

## 🚀 **PRÓXIMOS PASOS**

1. **En Android:** Implementar SharedPreferences para almacenar token
2. **Validaciones:** Agregar validación de email format
3. **Refresh Token:** Implementar renovación automática
4. **Roles:** Agregar roles de usuario si necesario
5. **Rate Limiting:** Protección contra ataques de fuerza bruta

---

## ✅ **RESUMEN FINAL**

**🎉 ¡IMPLEMENTACIÓN COMPLETA Y FUNCIONAL!**

- 🔐 **JWT Authentication:** ✅ Completamente funcional
- 🗄️ **Base de Datos:** ✅ Esquemas creados y configurados
- 🛡️ **Seguridad:** ✅ bcrypt + JWT + verificaciones
- 📱 **Android Ready:** ✅ Documentación completa
- 🧪 **Testing:** ✅ Flujo completo verificado

**URL API:** `https://pruevasvercel.vercel.app`

**Tu API ahora es segura, escalable y lista para producción** 🚀