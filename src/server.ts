import app from './index.js'

const PORT = process.env.PORT || 3000

console.log('🚀 Iniciando servidor...')

const server = app.listen(PORT, () => {
  console.log('✅ ¡Servidor corriendo exitosamente!')
  console.log(`📡 API disponible en: http://localhost:${PORT}`)
  console.log(`🔍 Endpoints disponibles:`)
  console.log(`   GET    http://localhost:${PORT}/`)
  console.log(`   GET    http://localhost:${PORT}/tareas`)
  console.log(`   POST   http://localhost:${PORT}/tareas`)
  console.log(`   PUT    http://localhost:${PORT}/tareas/:id`)
  console.log(`   DELETE http://localhost:${PORT}/tareas/:id`)
  console.log(`   GET    http://localhost:${PORT}/db-status`)
  console.log('')
  console.log('📱 Para Android:')
  console.log(`   Emulador: http://10.0.2.2:${PORT}/tareas`)
  console.log(`   Dispositivo: http://[tu-ip-local]:${PORT}/tareas`)
  console.log('')
  console.log('🛑 Para detener: Ctrl + C')
})

server.on('error', (error) => {
  console.error('❌ Error del servidor:', error)
})

export default server