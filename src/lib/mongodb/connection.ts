import { MongoClient, Db } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.MONGO_URL
const MONGODB_DB = process.env.MONGODB_DB || 'lastminutelive'

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI, MONGODB_URL, or MONGO_URL environment variable')
}

interface MongoConnection {
  client: MongoClient
  db: Db
}

let cached: MongoConnection | null = null

export async function connectToMongoDB(): Promise<MongoConnection> {
  if (cached) {
    return cached
  }

  console.log('🔌 Connecting to MongoDB...')
  console.log(`📍 Database: ${MONGODB_DB}`)

  const client = new MongoClient(MONGODB_URI!)
  
  try {
    await client.connect()
    const db = client.db(MONGODB_DB)
    
    // Test the connection
    await db.admin().ping()
    console.log('✅ Connected to MongoDB:', MONGODB_DB)
    
    cached = { client, db }
    return cached
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error)
    console.error('   URI (masked):', MONGODB_URI?.replace(/\/\/.*@/, '//***:***@'))
    throw error
  }
}

export async function getMongoDb(): Promise<Db> {
  const { db } = await connectToMongoDB()
  return db
} 