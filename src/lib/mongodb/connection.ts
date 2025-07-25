import { MongoClient, Db } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL
const MONGODB_DB = process.env.MONGODB_DB || 'lastminutelive'

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local')
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

  const client = new MongoClient(MONGODB_URI!)
  
  try {
    await client.connect()
    const db = client.db(MONGODB_DB)
    
    console.log('✅ Connected to MongoDB:', MONGODB_DB)
    
    cached = { client, db }
    return cached
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error)
    throw error
  }
}

export async function getMongoDb(): Promise<Db> {
  const { db } = await connectToMongoDB()
  return db
} 