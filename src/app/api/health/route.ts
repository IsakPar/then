import { NextRequest, NextResponse } from 'next/server';
import { redisManager } from '@/lib/redis/redis-client';

export async function GET(request: NextRequest) {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            database: 'unknown',
            redis: 'unknown',
            mongodb: 'unknown'
        }
    };
    
    try {
        // Test database connection
        const db = await import('@/lib/db/connection');
        await db.db.execute('SELECT 1');
        health.services.database = 'healthy';
    } catch (error) {
        health.services.database = 'unhealthy';
        health.status = 'unhealthy';
        console.error('Database health check failed:', error);
    }
    
    try {
        // Test Redis connection
        if (process.env.REDIS_ENABLED === 'true') {
            const redis = await redisManager.getClient();
            await redis.ping();
            health.services.redis = 'healthy';
        } else {
            health.services.redis = 'disabled';
        }
    } catch (error) {
        health.services.redis = 'unhealthy';
        health.status = 'unhealthy';
        console.error('Redis health check failed:', error);
    }
    
    try {
        // Test MongoDB connection
        if (process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.MONGO_URL) {
            const { connectToMongoDB } = await import('@/lib/mongodb/connection');
            const { db } = await connectToMongoDB();
            await db.admin().ping();
            health.services.mongodb = 'healthy';
        } else {
            health.services.mongodb = 'not_configured';
        }
    } catch (error) {
        health.services.mongodb = 'unhealthy';
        health.status = 'unhealthy';
        console.error('MongoDB health check failed:', error);
    }
    
    return NextResponse.json(health, { 
        status: health.status === 'healthy' ? 200 : 503 
    });
} 