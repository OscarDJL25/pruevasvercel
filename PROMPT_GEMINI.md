# 🚀 PROMPT PARA GEMINI - INTEGRACIÓN API REST CON ANDROID STUDIO

## 📋 **CONTEXTO DEL PROYECTO**

Tengo una **API REST completamente funcional** desplegada en **Vercel** que maneja un sistema de tareas con autenticación JWT. Necesito integrarla con una aplicación Android usando **Retrofit** y **Kotlin**.

---

## 🌐 **INFORMACIÓN DE LA API**

### **📡 Detalles de Conexión**
- **URL Base:** `https://pruevasvercel.vercel.app`
- **Protocolo:** HTTPS
- **Estado:** ✅ **COMPLETAMENTE FUNCIONAL Y VERIFICADO**
- **Base de Datos:** PostgreSQL (AWS RDS)
- **Formato JSON:** **camelCase** (conversión automática desde snake_case en DB)

### **🔐 Sistema de Autenticación**
- **Tipo:** JWT (JSON Web Token)
- **Duración:** 30 días
- **Header:** `Authorization: Bearer <token>`
- **Endpoints de auth:**
  - `POST /login` - Iniciar sesión
  - `POST /register` - Registrar usuario

---

## 📊 **ENDPOINTS DISPONIBLES (TODOS FUNCIONANDO)**

### **1️⃣ Autenticación**

**POST /login**
```json
// Request
{
  "email": "test@ejemplo.com",
  "password": "123456"
}

// Response
{
  "message": "Login exitoso",
  "user": {
    "id": 1,
    "email": "test@ejemplo.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**POST /register**
```json
// Request
{
  "email": "nuevo@ejemplo.com",
  "password": "password123"
}

// Response
{
  "message": "Usuario registrado exitosamente",
  "user": {
    "id": 2,
    "email": "nuevo@ejemplo.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### **2️⃣ CRUD de Tareas (Requieren Authorization Header)**

**GET /tareas** - Obtener todas las tareas del usuario
```json
// Response (camelCase)
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

**POST /tareas** - Crear nueva tarea
```json
// Request (camelCase)
{
  "nombre": "Nueva Tarea",
  "descripcion": "Descripción de la tarea",
  "fechaAsignacion": "2024-11-25",
  "horaAsignacion": "14:30",
  "fechaEntrega": "2024-11-30",
  "horaEntrega": "18:00",
  "finalizada": false,
  "prioridad": "alta"
}

// Response
{
  "id": 13,
  "nombre": "Nueva Tarea",
  "descripcion": "Descripción de la tarea",
  "fechaAsignacion": "2024-11-25T00:00:00.000Z",
  "horaAsignacion": "14:30:00",
  "fechaEntrega": "2024-11-30T00:00:00.000Z",
  "horaEntrega": "18:00:00",
  "finalizada": false,
  "prioridad": 3,
  "usuarioId": 1
}
```

**PUT /tareas/{id}** - Actualizar tarea existente
```json
// Request (camelCase)
{
  "nombre": "Tarea Actualizada",
  "descripcion": "Nueva descripción",
  "fechaAsignacion": "2024-11-25",
  "horaAsignacion": "10:00",
  "fechaEntrega": "2024-12-01",
  "horaEntrega": "17:00",
  "finalizada": true,
  "prioridad": "media"
}

// Response (mismo formato que POST)
```

**DELETE /tareas/{id}** - Eliminar tarea
```json
// Response
{
  "message": "Tarea eliminada correctamente",
  "tarea": {
    // objeto de la tarea eliminada en camelCase
  }
}
```

---

## 🎯 **LO QUE NECESITO QUE GEMINI ME AYUDE A CREAR**

### **📱 Para Android Studio (Kotlin)**

1. **RetrofitClient configurado** con:
   - Base URL correcta
   - Interceptor para el token JWT
   - Gson converter para camelCase
   - Manejo de errores

2. **Data Classes** para:
   - `LoginRequest`
   - `LoginResponse`
   - `RegisterRequest`
   - `RegisterResponse`
   - `Tarea` (con formato camelCase)
   - `TareaRequest`

3. **Interface ApiService** con todos los endpoints

4. **Repository pattern** para:
   - Autenticación (login/register)
   - CRUD de tareas
   - Manejo del token en SharedPreferences

5. **ViewModel** básico para:
   - Gestión de estado de autenticación
   - Lista de tareas
   - Operaciones CRUD

6. **UI básica** con:
   - Pantalla de login
   - Lista de tareas
   - Crear/editar tarea

---

## ⚙️ **CONFIGURACIONES IMPORTANTES**

### **🔧 Retrofit Configuration**
```kotlin
// Headers requeridos
"Content-Type: application/json"
"Authorization: Bearer <token>"
```

### **📝 Mapeo de Prioridades**
```kotlin
// API usa integers para prioridad:
// 1 = "baja"
// 2 = "media"  
// 3 = "alta"
```

### **📅 Formato de Fechas**
```kotlin
// Fechas en formato: "YYYY-MM-DD"
// Horas en formato: "HH:mm:ss"
```

---

## ✅ **CASOS DE USO PRINCIPALES**

1. **Login del usuario**
2. **Obtener lista de tareas**
3. **Crear nueva tarea**
4. **Editar tarea existente**
5. **Eliminar tarea**
6. **Manejo de token y logout**

---

## 🔒 **CREDENCIALES DE PRUEBA**
```
Email: test@ejemplo.com
Password: 123456
```

---

## ❓ **PREGUNTAS ESPECÍFICAS PARA GEMINI**

1. ¿Cómo configurar Retrofit para manejar automáticamente el token JWT?
2. ¿Cuál es la mejor práctica para convertir entre los integers de prioridad y strings legibles?
3. ¿Cómo manejar la renovación automática del token de 30 días?
4. ¿Qué estructura de proyecto recomiendas para esta integración?
5. ¿Cómo implementar manejo robusto de errores de red?

**Por favor, proporciona código completo y funcional para cada componente, con explicaciones detalladas de las mejores prácticas.**