import Redis from 'ioredis';
import logger from './logger';

interface CacheEntry {
  value: string;
  expiresAt: number;
}

class CacheManager {
  private redis: Redis | null = null;
  private isRedisAvailable = false;
  private localCache = new Map<string, CacheEntry>();

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      // Set a short connection timeout so it fails quickly if Redis isn't running
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        retryStrategy: (times) => {
          if (times > 2) {
            logger.warn('Redis connection failed. Falling back to local in-memory cache.');
            this.isRedisAvailable = false;
            return null; // Stop retrying
          }
          return 1000;
        }
      });

      this.redis.on('connect', () => {
        logger.info('Successfully connected to Redis.');
        this.isRedisAvailable = true;
      });

      this.redis.on('error', (err) => {
        // Only log once to avoid flooding logs
        if (this.isRedisAvailable) {
          logger.warn('Redis connection lost. Falling back to local cache.', { error: err.message });
        }
        this.isRedisAvailable = false;
      });
    } catch (err: any) {
      logger.warn('Could not initialize Redis client. Falling back to local cache.', { error: err.message });
      this.isRedisAvailable = false;
    }
  }

  /**
   * Get cached item
   */
  async get<T>(key: string): Promise<T | null> {
    if (this.isRedisAvailable && this.redis) {
      try {
        const data = await this.redis.get(key);
        return data ? (JSON.parse(data) as T) : null;
      } catch (err: any) {
        logger.error('Redis GET error. Falling back to local cache retrieval.', { key, error: err.message });
      }
    }

    // In-memory fallback
    const entry = this.localCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.localCache.delete(key);
      return null;
    }

    return JSON.parse(entry.value) as T;
  }

  /**
   * Set cached item with optional TTL (default 1 hour / 3600 seconds)
   */
  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    const valueString = JSON.stringify(value);

    if (this.isRedisAvailable && this.redis) {
      try {
        await this.redis.set(key, valueString, 'EX', ttlSeconds);
        return;
      } catch (err: any) {
        logger.error('Redis SET error. Falling back to local cache set.', { key, error: err.message });
      }
    }

    // In-memory fallback
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.localCache.set(key, { value: valueString, expiresAt });
  }

  /**
   * Delete cached item
   */
  async del(key: string): Promise<void> {
    if (this.isRedisAvailable && this.redis) {
      try {
        await this.redis.del(key);
        return;
      } catch (err: any) {
        logger.error('Redis DEL error. Falling back to local cache del.', { key, error: err.message });
      }
    }

    // In-memory fallback
    this.localCache.delete(key);
  }

  /**
   * Clear keys matching a pattern (e.g. invalidating all products cached)
   */
  async clearPattern(pattern: string): Promise<void> {
    if (this.isRedisAvailable && this.redis) {
      try {
        const stream = this.redis.scanStream({ match: pattern });
        stream.on('data', async (keys: string[]) => {
          if (keys.length > 0) {
            const pipeline = this.redis!.pipeline();
            keys.forEach((key) => pipeline.del(key));
            await pipeline.exec();
          }
        });
        return;
      } catch (err: any) {
        logger.error('Redis scan and clear failed.', { pattern, error: err.message });
      }
    }

    // In-memory pattern clear
    // Normalize regex pattern since Redis uses glob matching (e.g. "product:*" -> /^product:.*$/)
    const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.localCache.keys()) {
      if (regexPattern.test(key)) {
        this.localCache.delete(key);
      }
    }
  }
}

export const cache = new CacheManager();
