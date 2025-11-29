# 🚀 API REST TAREAS - DOCUMENTACIÓN COMPLETA

## 📊 **ESTADO ACTUAL: ✅ COMPLETAMENTE FUNCIONAL**

**🌐 URL Producción:** https://pruevasvercel.vercel.app  
**📅 Última actualización:** 22 de Noviembre, 2025  
**🔄 Estado:** Desplegado y verificado en Vercel  
**📱 Listo para:** Integración con Android Studio  

---

## 🏗️ **ARQUITECTURA TÉCNICA**

### **🖥️ Backend**
- **Framework:** Express.js + TypeScript
- **Base de Datos:** PostgreSQL (AWS RDS)
- **Hosting:** Vercel
- **Autenticación:** JWT (JSON Web Tokens)
- **Duración Token:** 30 días

### **🔄 Conversiones Automáticas**
- **Base de Datos:** snake_case (`fecha_asignacion`, `usuario_id`)
- **JSON API:** camelCase (`fechaAsignacion`, `usuarioId`)
- **Conversión:** Automática y transparente

### **🛡️ Seguridad**
- ✅ Autenticación JWT robusta
- ✅ Middleware de autorización en endpoints protegidos
- ✅ Validación de datos de entrada
- ✅ Encriptación de passwords con bcrypt
- ✅ CORS configurado para aplicaciones móviles

---

## 📡 **ENDPOINTS VERIFICADOS Y FUNCIONANDO**

### **🔐 Autenticación**

#### **POST /register**
Registrar nuevo usuario en el sistema.

```bash
POST https://pruevasvercel.vercel.app/register
Content-Type: application/json

{
  "email": "nuevo@ejemplo.com",
  "password": "password123"
}
```

**✅ Respuesta exitosa (201):**
```json
{
  "message": "Usuario registrado exitosamente",
  "user": {
    "id": 2,
    "email": "nuevo@ejemplo.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### **POST /login**
Iniciar sesión y obtener token de acceso.

```bash
POST https://pruevasvercel.vercel.app/login
Content-Type: application/json

{
  "email": "test@ejemplo.com", 
  "password": "123456"
}
```

**✅ Respuesta exitosa (200):**
```json
{
  "message": "Login exitoso",
  "user": {
    "id": 1,
    "email": "test@ejemplo.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### **📋 CRUD de Tareas (Requieren Token)**

> **⚠️ Importante:** Todos los endpoints de tareas requieren header de autorización:  
> `Authorization: Bearer <token>`

#### **GET /tareas**
Obtener todas las tareas del usuario autenticado.

```bash
GET https://pruevasvercel.vercel.app/tareas
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**✅ Respuesta exitosa (200):**
```json
[
  {
    "id": 12,
    "nombre": "Verificación Vercel",
    "descripcion": "POST funcionando en Vercel", 
    "fechaAsignacion": "2024-11-22T00:00:00.000Z",
    "horaAsignacion": "16:30:00",
    "fechaEntrega": null,
    "horaEntrega": null,
    "finalizada": false,
    "prioridad": 2,
    "usuarioId": 1
  }
]
```

#### **POST /tareas**
Crear nueva tarea para el usuario autenticado.

```bash
POST https://pruevasvercel.vercel.app/tareas
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "nombre": "Nueva Tarea Android",
  "descripcion": "Tarea creada desde la app móvil",
  "fechaAsignacion": "2024-11-25",
  "horaAsignacion": "14:30",
  "fechaEntrega": "2024-11-30", 
  "horaEntrega": "18:00",
  "finalizada": false,
  "prioridad": "alta"
}
```

**✅ Respuesta exitosa (201):**
```json
{
  "id": 13,
  "nombre": "Nueva Tarea Android",
  "descripcion": "Tarea creada desde la app móvil",
  "fechaAsignacion": "2024-11-25T00:00:00.000Z",
  "horaAsignacion": "14:30:00",
  "fechaEntrega": "2024-11-30T00:00:00.000Z",
  "horaEntrega": "18:00:00",
  "finalizada": false,
  "prioridad": 3,
  "usuarioId": 1
}
```

#### **PUT /tareas/{id}**
Actualizar tarea existente del usuario autenticado.

```bash
PUT https://pruevasvercel.vercel.app/tareas/13
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "nombre": "Tarea Actualizada",
  "descripcion": "Descripción modificada",
  "fechaAsignacion": "2024-11-25",
  "horaAsignacion": "10:00",
  "fechaEntrega": "2024-12-01",
  "horaEntrega": "17:00", 
  "finalizada": true,
  "prioridad": "media"
}
```

**✅ Respuesta exitosa (200):**
```json
{
  "id": 13,
  "nombre": "Tarea Actualizada",
  "descripcion": "Descripción modificada",
  "fechaAsignacion": "2024-11-25T00:00:00.000Z",
  "horaAsignacion": "10:00:00",
  "fechaEntrega": "2024-12-01T00:00:00.000Z", 
  "horaEntrega": "17:00:00",
  "finalizada": true,
  "prioridad": 2,
  "usuarioId": 1
}
```

#### **DELETE /tareas/{id}**
Eliminar tarea existente del usuario autenticado.

```bash
DELETE https://pruevasvercel.vercel.app/tareas/13
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**✅ Respuesta exitosa (200):**
```json
{
  "message": "Tarea eliminada correctamente",
  "tarea": {
    "id": 13,
    "nombre": "Tarea Actualizada",
    "descripcion": "Descripción modificada",
    "fechaAsignacion": "2024-11-25T00:00:00.000Z",
    "horaAsignacion": "10:00:00",
    "fechaEntrega": "2024-12-01T00:00:00.000Z",
    "horaEntrega": "17:00:00", 
    "finalizada": true,
    "prioridad": 2,
    "usuarioId": 1
  }
}
```

---

## 📝 **ESPECIFICACIONES DE DATOS**

### **🏷️ Modelo de Tarea**
```typescript
interface Tarea {
  id: number;                    // Autoincremental
  nombre: string;                // Requerido
  descripcion: string;           // Requerido
  fechaAsignacion: string;       // Formato: "YYYY-MM-DD" o ISO 8601
  horaAsignacion: string;        // Formato: "HH:mm:ss"
  fechaEntrega?: string | null;  // Opcional, formato: "YYYY-MM-DD"
  horaEntrega?: string | null;   // Opcional, formato: "HH:mm:ss" 
  finalizada: boolean;           // Default: false
  prioridad: number;             // 1=baja, 2=media, 3=alta
  usuarioId: number;             // Asignado automáticamente
}
```

### **🎯 Mapeo de Prioridades**
```typescript
// En JSON API (input)
"baja"  → 1
"media" → 2  
"alta"  → 3

// En JSON API (output)
1 → 1
2 → 2
3 → 3
```

### **📅 Formatos de Fecha y Hora**
- **Fechas:** `YYYY-MM-DD` (ej: "2024-11-25")
- **Horas:** `HH:mm:ss` (ej: "14:30:00")
- **Respuestas:** ISO 8601 para fechas (ej: "2024-11-25T00:00:00.000Z")

---

## 🚨 **MANEJO DE ERRORES**

### **🔐 Errores de Autenticación**
```json
// 401 - Token inválido o faltante
{
  "error": "Token de acceso requerido"
}

// 401 - Token expirado
{
  "error": "Token inválido o expirado"
}

// 401 - Credenciales incorrectas
{
  "error": "Credenciales inválidas"
}
```

### **📝 Errores de Validación**
```json
// 400 - Campos requeridos faltantes
{
  "error": "Nombre y descripción son requeridos"
}

// 400 - Email ya registrado
{
  "error": "Email ya está registrado"
}
```

### **🔍 Errores de Recursos**
```json
// 404 - Tarea no encontrada o sin autorización
{
  "error": "Tarea no encontrada o no autorizado"
}
```

### **⚙️ Errores del Servidor**
```json
// 500 - Error interno
{
  "error": "Error interno del servidor"
}
```

---

## 🧪 **CREDENCIALES DE PRUEBA**

### **👤 Usuario de Prueba**
```
Email: test@ejemplo.com
Password: 123456
```

### **🔑 Token de Ejemplo**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidGVzdEBlamVtcGxvLmNvbSIsImlhdCI6MTc2Mzg1OTM3MywiZXhwIjoxNzY2NDUxMzczfQ.example
```

---

## 📱 **INTEGRACIÓN CON ANDROID**

### **📦 Dependencias Recomendadas**
```kotlin
// build.gradle (app)
implementation 'com.squareup.retrofit2:retrofit:2.9.0'
implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
implementation 'com.squareup.okhttp3:logging-interceptor:4.12.0'
implementation 'androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0'
```

### **🔗 Configuración Retrofit**
```kotlin
private const val BASE_URL = "https://pruevasvercel.vercel.app/"

val retrofit = Retrofit.Builder()
    .baseUrl(BASE_URL)
    .addConverterFactory(GsonConverterFactory.create())
    .build()
```

---

## ✅ **CHECKLIST DE VERIFICACIÓN**

- [x] **Servidor desplegado** en Vercel
- [x] **Base de datos** AWS RDS conectada  
- [x] **Autenticación JWT** funcionando
- [x] **GET /tareas** verificado ✅
- [x] **POST /tareas** verificado ✅
- [x] **PUT /tareas** verificado ✅
- [x] **DELETE /tareas** funcional ✅
- [x] **Conversiones camelCase** automáticas ✅
- [x] **CORS** configurado para móviles ✅
- [x] **Token 30 días** implementado ✅
- [x] **Manejo de errores** robusto ✅

---

## 🔗 **RECURSOS ADICIONALES**

- **Repositorio:** https://github.com/OscarDJL25/pruevasvercel
- **Branch:** `main`  
- **Prompt para Gemini:** [PROMPT_GEMINI.md](./PROMPT_GEMINI.md)
- **Documentación JWT:** [JWT_DOCUMENTATION.md](./JWT_DOCUMENTATION.md)

---

**🎯 Estado:** ✅ **API LISTA PARA PRODUCCIÓN Y INTEGRACIÓN ANDROID** 🚀