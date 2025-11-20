import dotenv from 'dotenv'
import pkg from 'pg'

dotenv.config()
const { Pool } = pkg

const testConnection = async () => {
  console.log('🔍 Probando conexión a AWS RDS...')
  console.log('Host:', process.env.AWS_DB_HOST)
  console.log('Database:', process.env.AWS_DB_NAME)
  console.log('User:', process.env.AWS_DB_USER)
  
  const pool = new Pool({
    host: process.env.AWS_DB_HOST,
    port: process.env.AWS_DB_PORT || 5432,
    user: process.env.AWS_DB_USER,
    password: process.env.AWS_DB_PASSWORD,
    database: process.env.AWS_DB_NAME,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    const client = await pool.connect()
    console.log('✅ ¡Conexión exitosa a AWS RDS!')
    
    // Probar consulta básica
    const result = await client.query('SELECT NOW() as current_time, version() as db_version')
    console.log('⏰ Tiempo actual:', result.rows[0].current_time)
    console.log('🗄️ Versión PostgreSQL:', result.rows[0].db_version.substring(0, 50) + '...')
    
    // Verificar si existe la tabla tareas
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tareas'
      )
    `)
    
    if (tableExists.rows[0].exists) {
      console.log('📋 ✅ Tabla "tareas" ya existe')
      
      // Contar registros existentes
      const count = await client.query('SELECT COUNT(*) FROM tareas')
      console.log(`📊 Registros existentes: ${count.rows[0].count}`)
    } else {
      console.log('📋 ⚠️ Tabla "tareas" no existe - será creada automáticamente')
    }
    
    client.release()
    await pool.end()
    console.log('🎯 ¡Todo listo para usar AWS RDS!')
    
  } catch (err) {
    console.error('❌ Error de conexión:', err.message)
    if (err.code) {
      console.error('Código de error:', err.code)
    }
    await pool.end()
  }
}

testConnection()