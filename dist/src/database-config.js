import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pkg;
// Configuración flexible de base de datos
export const createDatabasePool = () => {
    const dbType = process.env.DB_TYPE || 'vercel'; // 'vercel' o 'aws'
    let connectionConfig;
    if (dbType === 'aws') {
        // Configuración para AWS RDS
        console.log('🔗 Conectando a AWS RDS PostgreSQL...');
        connectionConfig = {
            host: process.env.AWS_DB_HOST,
            port: process.env.AWS_DB_PORT || 5432,
            user: process.env.AWS_DB_USER,
            password: process.env.AWS_DB_PASSWORD,
            database: process.env.AWS_DB_NAME,
            ssl: {
                rejectUnauthorized: false
            }
        };
    }
    else {
        // Configuración original para Vercel (mantener como estaba)
        console.log('🔗 Conectando a Vercel PostgreSQL...');
        connectionConfig = {
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        };
    }
    const pool = new Pool(connectionConfig);
    // Probar la conexión
    pool.on('connect', () => {
        console.log(`✅ Conectado a base de datos: ${dbType.toUpperCase()}`);
    });
    pool.on('error', (err) => {
        console.error('❌ Error de conexión a base de datos:', err);
    });
    return pool;
};
export default createDatabasePool();
