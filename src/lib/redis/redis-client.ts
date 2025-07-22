import Redis from 'ioredis';

// NOTE: Redis is mocked/disabled for investor prototype.
// Production build should enable Redis for full real-time seat locking & pub/sub updates.
// See implementation in SeatLockingService.ts

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
  enableOfflineQueue: boolean;
}

class RedisClientManager {
  private static instance: RedisClientManager;
  private client: Redis | null = null;
  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;
  private redisEnabled: boolean = false;

  private constructor() {
    // Check if Redis is enabled via environment variable
    this.redisEnabled = process.env.REDIS_ENABLED === 'true';
  }

  static getInstance(): RedisClientManager {
    if (!RedisClientManager.instance) {
      RedisClientManager.instance = new RedisClientManager();
    }
    return RedisClientManager.instance;
  }

  private getConfig(): RedisConfig {
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false
    };
  }

  async getClient(): Promise<Redis> {
    if (!this.redisEnabled) {
      throw new Error('Redis is disabled for this environment');
    }
    
    if (!this.client) {
      const config = this.getConfig();
      
      this.client = new Redis({
        host: config.host,
        port: config.port,
        password: config.password,
        db: config.db,
        maxRetriesPerRequest: config.maxRetriesPerRequest,
        enableOfflineQueue: config.enableOfflineQueue,
        lazyConnect: true
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        console.log('✅ Redis client connected');
      });

      this.client.on('ready', () => {
        console.log('🚀 Redis client ready');
      });

      try {
        await this.client.connect();
      } catch (error) {
        console.error('❌ Failed to connect to Redis:', error);
        // For development, continue without Redis
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️  Running without Redis in development mode');
          return null as any;
        }
        throw error;
      }
    }

    return this.client;
  }

  async getPubClient(): Promise<Redis> {
    if (!this.pubClient) {
      const config = this.getConfig();
      this.pubClient = new Redis(config);
      
      this.pubClient.on('error', (err) => {
        console.error('Redis Pub Client Error:', err);
      });
    }
    return this.pubClient;
  }

  async getSubClient(): Promise<Redis> {
    if (!this.subClient) {
      const config = this.getConfig();
      this.subClient = new Redis(config);
      
      this.subClient.on('error', (err) => {
        console.error('Redis Sub Client Error:', err);
      });
    }
    return this.subClient;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
    if (this.pubClient) {
      await this.pubClient.quit();
      this.pubClient = null;
    }
    if (this.subClient) {
      await this.subClient.quit();
      this.subClient = null;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = await this.getClient();
      if (!client) return false;
      
      const result = await client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const redisManager = RedisClientManager.getInstance(); 