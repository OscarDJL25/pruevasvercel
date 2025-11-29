import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from './database-config.js';
// ========================================
// FUNCIONES DE TRANSFORMACIÓN NAMING
// ========================================
/**
 * Convierte camelCase a snake_case
 * Ej: fechaAsignacion -> fecha_asignacion
 */
const camelToSnake = (str) => {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};
/**
 * Convierte snake_case a camelCase
 * Ej: fecha_asignacion -> fechaAsignacion
 */
const snakeToCamel = (str) => {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};
/**
 * Convierte un objeto de camelCase a snake_case
 * Para enviar a la base de datos
 */
const objectToSnakeCase = (obj) => {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(objectToSnakeCase);
    }
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
        const snakeKey = camelToSnake(key);
        converted[snakeKey] = typeof value === 'object' ? objectToSnakeCase(value) : value;
    }
    return converted;
};
/**
 * Convierte un objeto de snake_case a camelCase
 * Para responder al cliente JSON
 */
const objectToCamelCase = (obj) => {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(objectToCamelCase);
    }
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
        const camelKey = snakeToCamel(key);
        converted[camelKey] = typeof value === 'object' ? objectToCamelCase(value) : value;
    }
    return converted;
};
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
// =====================================
// CONFIGURACIÓN CORS PARA ANDROID
// =====================================
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    }
    else {
        next();
    }
});
app.use(express.json());
// =====================================
// CONFIGURACIÓN JWT
// =====================================
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const SALT_ROUNDS = 10;
// =====================================
// MIDDLEWARE DE AUTENTICACIÓN
// =====================================
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) {
        return res.status(401).json({ error: 'Token de acceso requerido' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    }
    catch (error) {
        console.error('Error verificando token:', error);
        return res.status(403).json({ error: 'Token inválido o expirado' });
    }
};
app.get('/', (req, res) => {
    const dbType = process.env.DB_TYPE || 'vercel';
    res.type('html').send(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Express on Vercel - Dual DB Support</title>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body>
        <nav>
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/tareas">Tareas (DB)</a>
          <a href="/db-status">DB Status</a>
        </nav>
        <h1>Welcome to Express API 🚀</h1>
        <p>API con soporte para múltiples bases de datos</p>
        <div style="background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>📊 Configuración Actual:</h3>
          <p><strong>Base de Datos:</strong> ${dbType.toUpperCase()}</p>
          <p><strong>Endpoints disponibles:</strong></p>
          <ul>
            <li>GET /tareas - Obtener todas las tareas</li>y
            <li>POST /tareas - Crear nueva tarea</li>
            <li>PUT /tareas/:id - Actualizar tarea</li>
            <li>DELETE /tareas/:id - Eliminar tarea</li>
            <li>GET /db-status - Estado de la conexión</li>
          </ul>
        </div>
        <img src="/logo.png" alt="Logo" width="120" />
      </body>
    </html>
  `);
});
app.get('/about', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'components', 'about.htm'));
});
// =====================================
// ENDPOINTS DE AUTENTICACIÓN
// =====================================
// POST /register - Registrar nuevo usuario
app.post('/register', async (req, res) => {
    console.log('🔵 POST /register - Body:', req.body);
    const { email, password } = req.body;
    // Validaciones básicas
    if (!email || !password) {
        return res.status(400).json({ error: 'Email y password son requeridos' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password debe tener al menos 6 caracteres' });
    }
    try {
        // Verificar si el usuario ya existe
        const existingUser = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email.toLowerCase()]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }
        // Hashear la contraseña
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        // Crear el usuario
        const result = await pool.query('INSERT INTO usuarios (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at', [email.toLowerCase(), passwordHash]);
        const newUser = result.rows[0];
        // Generar token JWT (30 días para pruebas)
        const token = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '30d' });
        console.log('✅ Usuario registrado:', newUser);
        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            user: {
                id: newUser.id,
                email: newUser.email,
                created_at: newUser.created_at
            },
            token
        });
    }
    catch (error) {
        console.error('❌ Error registrando usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// POST /login - Iniciar sesión
app.post('/login', async (req, res) => {
    console.log('🔵 POST /login - Body:', req.body);
    const { email, password } = req.body;
    // Validaciones básicas
    if (!email || !password) {
        return res.status(400).json({ error: 'Email y password son requeridos' });
    }
    try {
        // Buscar el usuario
        const result = await pool.query('SELECT id, email, password_hash FROM usuarios WHERE email = $1', [email.toLowerCase()]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        const user = result.rows[0];
        // Verificar la contraseña
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        // Generar token JWT (30 días para pruebas)
        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
        console.log('✅ Login exitoso para usuario:', user.email);
        res.json({
            message: 'Login exitoso',
            user: {
                id: user.id,
                email: user.email
            },
            token
        });
    }
    catch (error) {
        console.error('❌ Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Nuevo endpoint de diagnóstico de base de datos
app.get('/db-status', async (req, res) => {
    try {
        const dbType = process.env.DB_TYPE || 'vercel';
        const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
        res.json({
            status: 'connected',
            database_type: dbType,
            connection_time: result.rows[0].current_time,
            database_version: result.rows[0].db_version,
            message: `✅ Conectado exitosamente a ${dbType.toUpperCase()} PostgreSQL`
        });
    }
    catch (err) {
        res.status(500).json({
            status: 'error',
            database_type: process.env.DB_TYPE || 'vercel',
            error: err.message,
            message: '❌ Error de conexión a la base de datos'
        });
    }
});
// =====================================
// ENDPOINT DE SINCRONIZACIÓN
// =====================================
/**
 * POST /tareas/sync - Endpoint de sincronización para aplicación móvil
 *
 * Maneja la sincronización bidireccional de tareas entre cliente y servidor:
 * - Creación de nuevas tareas del cliente
 * - Actualización de tareas existentes con resolución de conflictos basada en timestamps
 * - Eliminación lógica (soft delete) de tareas
 *
 * @param {Array} req.body - Array de tareas del cliente en camelCase
 * @returns {Object} - { updatedTasks: Array, conflicts: Array }
 */
app.post('/tareas/sync', authenticateToken, async (req, res) => {
    console.log('🔄 POST /tareas/sync - Usuario ID:', req.userId);
    console.log('🔄 Tareas recibidas del cliente:', req.body.length || 0);
    const { userId } = req;
    const tareasCliente = req.body || [];
    // Arrays para almacenar resultados de sincronización
    const updatedTasks = [];
    const conflicts = [];
    try {
        // Iterar sobre cada tarea del cliente
        for (const tareaCliente of tareasCliente) {
            console.log('🔄 Procesando tarea cliente:', tareaCliente.idApi, tareaCliente.nombre);
            // Extraer idApi del cliente - es el ID de la tarea en el servidor
            const idApi = tareaCliente.idApi;
            // BIFURCACIÓN PRINCIPAL BASADA EN idApi
            if (!idApi || idApi === null || idApi === undefined) {
                // ========================================
                // CASO A: TAREA NUEVA (idApi es null/undefined)
                // ========================================
                console.log('➕ Creando nueva tarea para el cliente - idApi es null/undefined');
                // Convertir datos del cliente a snake_case para la BD
                const dbData = objectToSnakeCase(tareaCliente);
                // Preparar valores para insertar
                const fechaHoy = new Date().toISOString().split('T')[0];
                const horaAhora = new Date().toTimeString().split(' ')[0];
                const currentTimestamp = Date.now();
                // Mapear prioridad string a integer
                const prioridadMap = { 'baja': 1, 'media': 2, 'alta': 3 };
                const prioridadInt = typeof dbData.prioridad === 'string'
                    ? prioridadMap[dbData.prioridad.toLowerCase()] || 2
                    : dbData.prioridad || 2;
                const valores = [
                    dbData.nombre || null,
                    dbData.descripcion || null,
                    dbData.fecha_asignacion || fechaHoy,
                    dbData.hora_asignacion || horaAhora,
                    dbData.fecha_entrega || null,
                    dbData.hora_entrega || null,
                    dbData.finalizada !== undefined ? dbData.finalizada : false,
                    prioridadInt,
                    userId,
                    false, // pending_sync
                    currentTimestamp, // updated_at
                    false, // deleted
                    null // deleted_at
                ];
                const result = await pool.query(`
          INSERT INTO tareas 
          (nombre, descripcion, fecha_asignacion, hora_asignacion, 
           fecha_entrega, hora_entrega, finalizada, prioridad, usuario_id,
           pending_sync, updated_at, deleted, deleted_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
          RETURNING *
        `, valores);
                const nuevaTarea = objectToCamelCase(result.rows[0]);
                updatedTasks.push(nuevaTarea);
                console.log('✅ Nueva tarea creada con ID:', nuevaTarea.id);
            }
            else {
                // ========================================
                // CASO B: TAREA EXISTENTE (idApi tiene valor)
                // ========================================
                console.log('🔄 Procesando tarea existente con idApi:', idApi);
                // Primero verificar si la tarea realmente existe en la BD para este usuario
                const serverResult = await pool.query('SELECT * FROM tareas WHERE id = $1 AND usuario_id = $2', [idApi, userId]);
                // Si no existe la tarea en el servidor, ignorarla y continuar
                if (serverResult.rows.length === 0) {
                    console.log('⚠️ Tarea no encontrada en servidor, ignorando idApi:', idApi);
                    continue;
                }
                const tareaServidor = serverResult.rows[0];
                console.log('📋 Tarea encontrada en servidor:', tareaServidor.id);
                // Verificar el flag deleted del cliente
                if (tareaCliente.deleted === true) {
                    // ========================================
                    // ELIMINACIÓN LÓGICA (SOFT DELETE)
                    // ========================================
                    console.log('🗑️ Eliminación lógica de tarea idApi:', idApi);
                    await pool.query('UPDATE tareas SET deleted = true, deleted_at = NOW(), updated_at = $1 WHERE id = $2 AND usuario_id = $3', [Date.now(), idApi, userId]);
                    console.log('✅ Tarea eliminada lógicamente:', idApi);
                    // No añadir a updatedTasks ni conflicts para eliminaciones
                    continue;
                }
                else {
                    // ========================================
                    // ACTUALIZACIÓN Y RESOLUCIÓN DE CONFLICTOS
                    // ========================================
                    console.log('🔄 Comparando timestamps para resolución de conflictos');
                    // Comparar timestamps para resolver conflictos
                    const clientTimestamp = tareaCliente.updatedAt;
                    const serverTimestamp = parseInt(tareaServidor.updated_at.toString());
                    console.log('⏰ Timestamps - Cliente:', clientTimestamp, 'Servidor:', serverTimestamp);
                    if (clientTimestamp > serverTimestamp) {
                        // Cliente gana - actualizar en servidor
                        console.log('📤 Cliente gana, actualizando servidor');
                        const dbData = objectToSnakeCase(tareaCliente);
                        const prioridadMap = { 'baja': 1, 'media': 2, 'alta': 3 };
                        const prioridadInt = typeof dbData.prioridad === 'string'
                            ? prioridadMap[dbData.prioridad.toLowerCase()] || 2
                            : dbData.prioridad || 2;
                        const updateResult = await pool.query(`
              UPDATE tareas SET
                nombre = $1, descripcion = $2,
                fecha_asignacion = $3, hora_asignacion = $4,
                fecha_entrega = $5, hora_entrega = $6,
                finalizada = $7, prioridad = $8,
                updated_at = $9
              WHERE id = $10 AND usuario_id = $11 
              RETURNING *
            `, [
                            dbData.nombre, dbData.descripcion,
                            dbData.fecha_asignacion, dbData.hora_asignacion,
                            dbData.fecha_entrega, dbData.hora_entrega,
                            dbData.finalizada, prioridadInt,
                            clientTimestamp, idApi, userId
                        ]);
                        const tareaActualizada = objectToCamelCase(updateResult.rows[0]);
                        updatedTasks.push(tareaActualizada);
                        console.log('✅ Tarea actualizada:', idApi);
                    }
                    else if (serverTimestamp > clientTimestamp) {
                        // Servidor gana - registrar conflicto
                        console.log('📥 Servidor gana, registrando conflicto');
                        const conflicto = {
                            taskId: idApi,
                            clientVersion: tareaCliente,
                            serverVersion: objectToCamelCase(tareaServidor),
                            conflictType: 'UPDATE_CONFLICT'
                        };
                        conflicts.push(conflicto);
                        console.log('⚠️ Conflicto registrado para tarea:', idApi);
                    }
                    else {
                        // Timestamps iguales - no hacer nada
                        console.log('⚖️ Timestamps iguales, no hay cambios para tarea:', idApi);
                    }
                }
            }
        }
        console.log(`✅ Sincronización completada - Actualizadas: ${updatedTasks.length}, Conflictos: ${conflicts.length}`);
        res.json({
            updatedTasks,
            conflicts
        });
    }
    catch (err) {
        console.error('❌ Error en sincronización:', err);
        res.status(500).json({ error: 'Error en la sincronización de tareas' });
    }
});
// =====================================
// ENDPOINTS DE TAREAS (PROTEGIDOS CON JWT)
// =====================================
// GET /tareas - Obtener tareas del usuario autenticado (solo las no eliminadas)
app.get('/tareas', authenticateToken, async (req, res) => {
    console.log('🔵 GET /tareas - Usuario ID:', req.userId);
    try {
        const result = await pool.query('SELECT * FROM tareas WHERE usuario_id = $1 AND deleted = false ORDER BY id ASC', [req.userId]);
        console.log(`✅ Obtenidas ${result.rows.length} tareas para usuario ${req.userId}`);
        // Convertir de snake_case (BD) a camelCase (JSON)
        const tareasEnCamelCase = objectToCamelCase(result.rows);
        res.json(tareasEnCamelCase);
    }
    catch (err) {
        console.error('Error al consultar la base de datos:', err);
        res.status(500).json({ error: 'Error al consultar la base de datos' });
    }
});
// DEBUG endpoint - para verificar esquema de tabla
app.get('/debug-schema', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 DEBUG - Verificando esquema de tabla tareas');
        // Verificar estructura de la tabla
        const schemaResult = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'tareas' 
      ORDER BY ordinal_position;
    `);
        // Verificar si hay datos en la tabla
        const countResult = await pool.query('SELECT COUNT(*) as total FROM tareas');
        res.json({
            schema: schemaResult.rows,
            totalRecords: countResult.rows[0].total,
            userId: req.userId
        });
    }
    catch (err) {
        console.error('🔍 DEBUG - Error al verificar esquema:', err);
        res.status(500).json({ error: err.message });
    }
});
// DEBUG endpoint - para investigar conversiones
app.post('/debug-conversion', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 DEBUG - Body original:', req.body);
        const bodyEnCamelCase = objectToCamelCase(req.body);
        console.log('🔍 DEBUG - Body en camelCase:', bodyEnCamelCase);
        const bodyEnSnakeCase = objectToSnakeCase(bodyEnCamelCase);
        console.log('🔍 DEBUG - Body en snake_case:', bodyEnSnakeCase);
        res.json({
            original: req.body,
            camelCase: bodyEnCamelCase,
            snakeCase: bodyEnSnakeCase
        });
    }
    catch (err) {
        console.error('🔍 DEBUG - Error:', err);
        res.status(500).json({ error: err.message });
    }
});
// POST /tareas - Crear tarea para el usuario autenticado
app.post('/tareas', authenticateToken, async (req, res) => {
    console.log('🔵 POST /tareas - Usuario ID:', req.userId);
    console.log('🔵 BODY RECIBIDO (camelCase):', req.body);
    // El body puede venir en camelCase o snake_case, normalizamos a camelCase
    const bodyEnCamelCase = objectToCamelCase(req.body);
    const { nombre, descripcion, fechaAsignacion, horaAsignacion, fechaEntrega, horaEntrega, finalizada, prioridad } = bodyEnCamelCase;
    console.log('🔵 Campos extraídos (camelCase):', { nombre, descripcion, fechaAsignacion, horaAsignacion });
    // Validar campos requeridos
    if (!nombre || !descripcion) {
        console.log('❌ Campos requeridos faltantes');
        return res.status(400).json({ error: 'Nombre y descripción son requeridos' });
    }
    try {
        console.log('🔵 Ejecutando INSERT con usuario_id:', req.userId);
        // Convertir valores camelCase a snake_case para la DB
        const dbData = objectToSnakeCase(bodyEnCamelCase);
        console.log('🔵 DEBUG - Datos convertidos para DB:', dbData);
        // Usar valores por defecto según esquema de DB
        const fechaHoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const horaAhora = new Date().toTimeString().split(' ')[0]; // HH:mm:ss
        const currentTimestamp = Date.now(); // Para updated_at
        // Mapear prioridad string a integer
        const prioridadMap = { 'baja': 1, 'media': 2, 'alta': 3 };
        const prioridadInt = typeof dbData.prioridad === 'string'
            ? prioridadMap[dbData.prioridad.toLowerCase()] || 2
            : dbData.prioridad || 2;
        const valores = [
            dbData.nombre || null, // $1 - requerido
            dbData.descripcion || null, // $2 - requerido  
            dbData.fecha_asignacion || fechaHoy, // $3 - NOT NULL, usar fecha actual
            dbData.hora_asignacion || horaAhora, // $4 - NOT NULL, usar hora actual
            dbData.fecha_entrega || null, // $5 - nullable
            dbData.hora_entrega || null, // $6 - nullable
            dbData.finalizada !== undefined ? dbData.finalizada : false, // $7 - boolean
            prioridadInt, // $8 - integer (1=baja, 2=media, 3=alta)
            req.userId, // $9 - usuario_id
            false, // $10 - pending_sync
            currentTimestamp, // $11 - updated_at
            false, // $12 - deleted
            null // $13 - deleted_at
        ];
        console.log('🔵 DEBUG - Valores corregidos para INSERT:', valores);
        // Insertamos usando nombres snake_case para la DB incluyendo campos de sincronización
        const result = await pool.query(`INSERT INTO tareas
        (nombre, descripcion, fecha_asignacion, hora_asignacion,
          fecha_entrega, hora_entrega, finalizada, prioridad, usuario_id,
          pending_sync, updated_at, deleted, deleted_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`, valores);
        // Convertir respuesta a camelCase
        const tareaCreada = objectToCamelCase(result.rows[0]);
        console.log('✅ Tarea creada para usuario:', req.userId, tareaCreada);
        res.status(201).json(tareaCreada);
    }
    catch (err) {
        console.error('❌ Error al insertar en la base de datos:', err);
        res.status(500).json({ error: 'Error al insertar en la base de datos' });
    }
});
// DELETE /tareas/:id - Eliminar tarea del usuario autenticado
app.delete('/tareas/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    console.log('🔴 DELETE /tareas/' + id + ' - Usuario ID:', req.userId);
    try {
        // Verificar que la tarea pertenece al usuario y obtener sus datos
        const checkResult = await pool.query('SELECT * FROM tareas WHERE id = $1 AND usuario_id = $2 AND deleted = false', [id, req.userId]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada o no autorizado' });
        }
        // Guardar datos antes de la eliminación lógica
        const tareaOriginal = checkResult.rows[0];
        // Eliminación lógica (soft delete) - marcar como eliminada
        const currentTimestamp = Date.now();
        const deleteResult = await pool.query('UPDATE tareas SET deleted = true, deleted_at = NOW(), updated_at = $1 WHERE id = $2 AND usuario_id = $3 RETURNING *', [currentTimestamp, id, req.userId]);
        // Convertir respuesta a camelCase
        const tareaEliminada = objectToCamelCase(deleteResult.rows[0]);
        console.log('🗑️ Tarea eliminada lógicamente:', tareaEliminada);
        res.json({ message: 'Tarea eliminada correctamente', tarea: tareaEliminada });
    }
    catch (err) {
        console.error('Error al eliminar de la base de datos:', err);
        res.status(500).json({ error: 'Error al eliminar de la base de datos' });
    }
});
// PUT /tareas/:id - Actualizar tarea del usuario autenticado
app.put('/tareas/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    console.log('🔵 PUT /tareas/' + id + ' - Usuario ID:', req.userId);
    console.log('🔵 BODY RECIBIDO (puede ser camelCase):', req.body);
    // Normalizar input a camelCase
    const bodyEnCamelCase = objectToCamelCase(req.body);
    const { nombre, descripcion, fechaAsignacion, horaAsignacion, fechaEntrega, horaEntrega, finalizada, prioridad } = bodyEnCamelCase;
    try {
        // Verificar que la tarea pertenece al usuario antes de actualizar
        const checkResult = await pool.query('SELECT id FROM tareas WHERE id = $1 AND usuario_id = $2 AND deleted = false', [id, req.userId]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada o no autorizado' });
        }
        // Convertir valores camelCase a snake_case para la DB
        const dbData = objectToSnakeCase(bodyEnCamelCase);
        const currentTimestamp = Date.now();
        // Mapear prioridad string a integer si es necesario
        const prioridadMap = { 'baja': 1, 'media': 2, 'alta': 3 };
        const prioridadInt = typeof dbData.prioridad === 'string'
            ? prioridadMap[dbData.prioridad.toLowerCase()] || 2
            : dbData.prioridad || 2;
        // UPDATE usando snake_case para la DB, incluyendo updated_at
        const result = await pool.query(`UPDATE tareas SET
        nombre = $1, descripcion = $2,
        fecha_asignacion = $3, hora_asignacion = $4,
        fecha_entrega = $5, hora_entrega = $6,
        finalizada = $7, prioridad = $8, updated_at = $9
      WHERE id = $10 AND usuario_id = $11 RETURNING *`, [dbData.nombre, dbData.descripcion, dbData.fecha_asignacion, dbData.hora_asignacion,
            dbData.fecha_entrega, dbData.hora_entrega, dbData.finalizada, prioridadInt,
            currentTimestamp, id, req.userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }
        // Convertir respuesta a camelCase
        const tareaActualizada = objectToCamelCase(result.rows[0]);
        console.log('✅ Tarea actualizada:', tareaActualizada);
        res.json(tareaActualizada);
    }
    catch (err) {
        console.error('Error al actualizar la base de datos:', err);
        res.status(500).json({ error: 'Error al actualizar la base de datos' });
    }
});
export default app;
