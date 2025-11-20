import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import pool from './database-config.js'

// ========================================
// CONFIGURACIÓN ORIGINAL COMENTADA PARA REFERENCIA
// ========================================
// import pkg from 'pg'
// const { Pool } = pkg
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false }
// })
// ========================================

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

app.use(express.json())

app.get('/', (req, res) => {
  const dbType = process.env.DB_TYPE || 'vercel'
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
            <li>GET /tareas - Obtener todas las tareas</li>
            <li>POST /tareas - Crear nueva tarea</li>
            <li>PUT /tareas/:id - Actualizar tarea</li>
            <li>DELETE /tareas/:id - Eliminar tarea</li>
            <li>GET /db-status - Estado de la conexión</li>
          </ul>
        </div>
        <img src="/logo.png" alt="Logo" width="120" />
      </body>
    </html>
  `)
})

app.get('/about', function (req, res) {
  res.sendFile(path.join(__dirname, '..', 'components', 'about.htm'))
})

// Nuevo endpoint de diagnóstico de base de datos
app.get('/db-status', async (req, res) => {
  try {
    const dbType = process.env.DB_TYPE || 'vercel'
    const result = await pool.query('SELECT NOW() as current_time, version() as db_version')
    
    res.json({
      status: 'connected',
      database_type: dbType,
      connection_time: result.rows[0].current_time,
      database_version: result.rows[0].db_version,
      message: `✅ Conectado exitosamente a ${dbType.toUpperCase()} PostgreSQL`
    })
  } catch (err) {
    res.status(500).json({
      status: 'error',
      database_type: process.env.DB_TYPE || 'vercel',
      error: err.message,
      message: '❌ Error de conexión a la base de datos'
    })
  }
})

app.get('/tareas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tareas ORDER BY id ASC')
    res.json(result.rows)
  } catch (err) {
    console.error('Error al consultar la base de datos:', err)
    res.status(500).json({ error: 'Error al consultar la base de datos' })
  }
})

app.post('/tareas', express.json(), async (req, res) => {
  const {
    nombre, descripcion, fecha_asignacion, hora_asignacion,
    fecha_entrega, hora_entrega, finalizada, prioridad
  } = req.body 
  try {
    const result = await pool.query(
      `INSERT INTO tareas
        (nombre, descripcion, fecha_asignacion, hora_asignacion,
          fecha_entrega, hora_entrega, finalizada, prioridad)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [nombre, descripcion, fecha_asignacion, hora_asignacion,
        fecha_entrega, hora_entrega, finalizada, prioridad]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('Error al insertar en la base de datos:', err)
    res.status(500).json({ error: 'Error al insertar en la base de datos' })
  }
})

app.delete('/tareas/:id', async (req, res) => {
  const { id } = req.params
  try {
    await pool.query('DELETE FROM tareas WHERE id = $1', [id])
    res.status(204).send()
  } catch (err) {
    console.error('Error al eliminar de la base de datos:', err)
    res.status(500).json({ error: 'Error al eliminar de la base de datos' })
  }
})

app.put('/tareas/:id', express.json(), async (req, res) => {
  const { id } = req.params
  const {
    nombre, descripcion, fecha_asignacion, hora_asignacion,
    fecha_entrega, hora_entrega, finalizada, prioridad
  } = req.body
  try {
    const result = await pool.query(
      `UPDATE tareas SET
        nombre = $1, descripcion = $2,
        fecha_asignacion = $3, hora_asignacion = $4,
        fecha_entrega = $5, hora_entrega = $6,
        finalizada = $7, prioridad = $8
      WHERE id = $9 RETURNING *`,
      [nombre, descripcion, fecha_asignacion, hora_asignacion,
        fecha_entrega, hora_entrega, finalizada, prioridad, id]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error('Error al actualizar la base de datos:', err)
    res.status(500).json({ error: 'Error al actualizar la base de datos' })
  }
})

export default app
