import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for serverless environments
neonConfig.webSocketConstructor = ws;

// Validate DATABASE_URL environment variable
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Validate DATABASE_URL format
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
  throw new Error(
    "DATABASE_URL must be a valid PostgreSQL connection string starting with postgresql:// or postgres://"
  );
}

console.log('🔗 Connecting to Neon Postgres...');

// Create connection pool with error handling
export const pool = new Pool({ 
  connectionString: databaseUrl,
  // Connection pool configuration for better reliability
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Initialize Drizzle with the pool and schema
export const db = drizzle({ client: pool, schema });

// Test database connection function
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    console.log('🧪 Testing database connection...');
    
    // Simple query to test connection
    const result = await db.execute(sql`SELECT 1 as test`);
    
    if (result.rows && result.rows.length > 0) {
      console.log('✅ Database connection successful!');
      return true;
    } else {
      console.error('❌ Database connection test failed: No results returned');
      return false;
    }
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}

// Graceful shutdown function
export async function closeDatabaseConnection(): Promise<void> {
  try {
    console.log('🔌 Closing database connection...');
    await pool.end();
    console.log('✅ Database connection closed successfully');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, closing database connection...');
  await closeDatabaseConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, closing database connection...');
  await closeDatabaseConnection();
  process.exit(0);
});

// Import sql for the test function
import { sql } from 'drizzle-orm';