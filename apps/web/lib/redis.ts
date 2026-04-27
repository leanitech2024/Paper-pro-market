import { logger } from '@/lib/logger';

export type RedisClient = {
  get(key: string): Promise<string | null>;
  set(key: string, value: unknown, options?: { ex?: number }): Promise<string | null>;
  mget(...keys: string[]): Promise<(string | null)[]>;
  mset(data: Record<string, string>): Promise<string | null>;
  del(...keys: string[]): Promise<number>;
  exists(...keys: string[]): Promise<number>;
  pipeline(): RedisPipeline;
};

export type RedisPipeline = {
  set(key: string, value: unknown, options?: { ex?: number }): RedisPipeline;
  get(key: string): RedisPipeline;
  del(key: string): RedisPipeline;
  exec(): Promise<unknown[]>;
};

let redisClient: RedisClient | null = null;
let initialized = false;
let clientReadyPromise: Promise<unknown> | null = null;

async function createDevRedis(url: string): Promise<RedisClient> {
  const IORedisModule = await import('ioredis');
  const IORedis = IORedisModule.default || IORedisModule;
  const innerClient = new IORedis(url, {
    maxRetriesPerRequest: 0,
    connectTimeout: 300,
    lazyConnect: true,
    enableOfflineQueue: false,
    retryStrategy: () => null,
  });

  let errorLogged = false;
  innerClient.on('error', (err: Error) => {
    if (!errorLogged) {
      logger.warn({ err: err.message }, 'Local Redis connection error (silencing further logs)');
      errorLogged = true;
    }
  });

  const facade: RedisClient = {
    async get(key: string) {
      try { return await innerClient.get(key); } catch { return null; }
    },
    async set(key: string, value: unknown, options?: { ex?: number }) {
      try {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        if (options?.ex) return await innerClient.set(key, serialized, 'EX', options.ex);
        return await innerClient.set(key, serialized);
      } catch { return null; }
    },
    async mget(...keys: string[]) {
      if (keys.length === 0) return [];
      try { return await innerClient.mget(...keys); } catch { return keys.map(() => null); }
    },
    async mset(data: Record<string, string>) {
      try { return await innerClient.mset(data); } catch { return null; }
    },
    async del(...keys: string[]) {
      try { return await innerClient.del(...keys); } catch { return 0; }
    },
    async exists(...keys: string[]) {
      try { return await innerClient.exists(...keys); } catch { return 0; }
    },
    pipeline() {
      const pipe = innerClient.pipeline();
      const wrapper: RedisPipeline = {
        set(key: string, value: unknown, options?: { ex?: number }) {
          const serialized = typeof value === 'string' ? value : JSON.stringify(value);
          if (options?.ex) pipe.set(key, serialized, 'EX', options.ex);
          else pipe.set(key, serialized);
          return wrapper;
        },
        get(key: string) { pipe.get(key); return wrapper; },
        del(key: string) { pipe.del(key); return wrapper; },
        exec: () => pipe.exec().then((results: unknown) =>
          (results as Array<[Error | null, unknown]> | null)?.map(([, v]) => v) ?? []
        ).catch(() => []),
      };
      return wrapper;
    }
  };
  return facade;
}

async function createProdRedis(): Promise<RedisClient> {
  const { Redis } = await import('@upstash/redis');
  const client = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL ?? '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
  });

  const pipeline = (): RedisPipeline => {
    const pipe = client.pipeline();
    const wrapper: RedisPipeline = {
      set(key: string, value: unknown, options?: { ex?: number }) {
        if (options?.ex) pipe.set(key, value, { ex: options.ex });
        else pipe.set(key, value);
        return wrapper;
      },
      get(key: string) { pipe.get(key); return wrapper; },
      del(key: string) { pipe.del(key); return wrapper; },
      exec: () => pipe.exec(),
    };
    return wrapper;
  };

  return {
    async get(key: string) {
      try {
        const val = await client.get(key);
        if (val === null || val === undefined) return null;
        return typeof val === 'string' ? val : JSON.stringify(val);
      } catch { return null; }
    },
    async set(key: string, value: unknown, options?: { ex?: number }) {
      try { return (await client.set(key, value, options?.ex ? { ex: options.ex } : undefined)) as string | null; }
      catch { return null; }
    },
    async mget(...keys: string[]) {
      if (keys.length === 0) return [];
      try {
        const results = await client.mget(...keys);
        return results.map((val: unknown) => {
          if (val === null || val === undefined) return null;
          return typeof val === 'string' ? val : JSON.stringify(val);
        });
      } catch { return keys.map(() => null); }
    },
    async mset(data: Record<string, string>) {
      try { return await client.mset(data); } catch { return null; }
    },
    async del(...keys: string[]) {
      try { return await client.del(...keys); } catch { return 0; }
    },
    async exists(...keys: string[]) {
      try { return await client.exists(...keys); } catch { return 0; }
    },
    pipeline,
  };
}

export function getRedis(): RedisClient | null {
  if (process.env.DISABLE_REDIS === 'true') {
    initialized = true;
    redisClient = null;
    return null;
  }
  if (initialized) return redisClient;
  initialized = true;

  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      logger.error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production');
      return null;
    }
    logger.info('Redis: using Upstash (production)');
    clientReadyPromise = createProdRedis().then((client) => {
      redisClient = client;
    }).catch((err) => {
      logger.error({ err }, 'Failed to initialize Upstash Redis');
    });
    return redisClient;
  }

  const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  logger.info({ url }, 'Redis: using local Redis (development)');
  clientReadyPromise = createDevRedis(url).then((client) => {
    redisClient = client;
  }).catch((err) => {
    logger.error({ err }, 'Failed to initialize local Redis');
  });
  return redisClient;
}

export async function waitForRedis(): Promise<RedisClient | null> {
  if (clientReadyPromise) await clientReadyPromise;
  return redisClient;
}
