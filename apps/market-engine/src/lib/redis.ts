import { logger } from './logger.js';

export type RedisClient = {
  get(key: string): Promise<string | null>;
  set(key: string, value: unknown, options?: { ex?: number }): Promise<string | null>;
  mget(...keys: string[]): Promise<(string | null)[]>;
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

function createDevRedis(url: string): RedisClient {
  let innerClient: RedisClient | null = null;

  import('ioredis').then((IORedisModule) => {
    const IORedis = IORedisModule.default || IORedisModule;
    const client = new IORedis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy(times: number) {
        if (times > 5) return null; 
        return Math.min(times * 100, 2000);
      }
    });

    let errorLogged = false;
    client.on('error', (err: Error) => {
      if (!errorLogged) {
        logger.warn({ err: err.message }, 'Local Redis connection error (silencing further logs)');
        errorLogged = true;
      }
    });

    const pipeline = () => {
      const pipe = client.pipeline();
      const wrapper: RedisPipeline = {
        set(key: string, value: unknown, options?: { ex?: number }) {
          const serialized = typeof value === 'string' ? value : JSON.stringify(value);
          if (options?.ex) {
            pipe.set(key, serialized, 'EX', options.ex);
          } else {
            pipe.set(key, serialized);
          }
          return wrapper;
        },
        get(key: string) {
          pipe.get(key);
          return wrapper;
        },
        del(key: string) {
          pipe.del(key);
          return wrapper;
        },
        exec: () => pipe.exec().then((results: unknown) => 
          (results as Array<[Error | null, unknown]> | null)?.map(([, v]) => v) ?? []
        ).catch(() => []),
      };
      return wrapper;
    };

    innerClient = {
      async get(key: string) {
        try { return await client.get(key); } catch (e) { return null; }
      },
      async set(key: string, value: unknown, options?: { ex?: number }) {
        try {
          const serialized = typeof value === 'string' ? value : JSON.stringify(value);
          if (options?.ex) {
            return await client.set(key, serialized, 'EX', options.ex);
          }
          return await client.set(key, serialized);
        } catch (e) { return null; }
      },
      async mget(...keys: string[]) {
        if (keys.length === 0) return [];
        try {
          return await client.mget(...keys);
        } catch (e) {
          return keys.map(() => null);
        }
      },
      async del(...keys: string[]) {
        try { return await client.del(...keys); } catch (e) { return 0; }
      },
      async exists(...keys: string[]) {
        try { return await client.exists(...keys); } catch (e) { return 0; }
      },
      pipeline,
    };
  }).catch(err => {
    logger.error({ err: err.message }, 'Failed to load ioredis in dev mode');
  });

  const facade: RedisClient = {
    async get(key) { return innerClient ? innerClient.get(key) : null; },
    async set(key, value, options) { return innerClient ? innerClient.set(key, value, options) : null; },
    async mget(...keys) { return innerClient ? innerClient.mget(...keys) : keys.map(() => null); },
    async del(...keys) { return innerClient ? innerClient.del(...keys) : 0; },
    async exists(...keys) { return innerClient ? innerClient.exists(...keys) : 0; },
    pipeline() {
      if (innerClient) return innerClient.pipeline();
      const mockPipe: RedisPipeline = {
        set() { return mockPipe; },
        get() { return mockPipe; },
        del() { return mockPipe; },
        async exec() { return []; }
      };
      return mockPipe;
    }
  };
  return facade;
}

function createProdRedis(): RedisClient {
  // We can use a dynamic import here because top level await is not always safely supported across all fastify entrypoints without forcing top level module changes
  let client: any = null;
  import('@upstash/redis').then(({ Redis }) => {
     client = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  });

  const pipeline = () => {
    if (!client) {
      return {
        set() { return this; },
        get() { return this; },
        del() { return this; },
        async exec() { return []; }
      };
    }
    const pipe = client.pipeline();
    const wrapper: RedisPipeline = {
      set(key: string, value: unknown, options?: { ex?: number }) {
        if (options?.ex) {
          pipe.set(key, value, { ex: options.ex });
        } else {
          pipe.set(key, value);
        }
        return wrapper;
      },
      get(key: string) {
        pipe.get(key);
        return wrapper;
      },
      del(key: string) {
        pipe.del(key);
        return wrapper;
      },
      exec: () => pipe.exec().catch(() => []),
    };
    return wrapper;
  };

  return {
    async get(key: string) {
      if (!client) return null;
      try {
        const val = await client.get(key);
        if (val === null || val === undefined) return null;
        return typeof val === 'string' ? val : JSON.stringify(val);
      } catch (e) { return null; }
    },
    async set(key: string, value: unknown, options?: { ex?: number }) {
      if (!client) return null;
      try {
        return await client.set(key, value, options?.ex ? { ex: options.ex } : undefined);
      } catch (e) { return null; }
    },
    async mget(...keys: string[]) {
      if (!client) return keys.map(() => null);
      if (keys.length === 0) return [];
      try {
        const results = await client.mget(...keys);
        return results.map((val: unknown) => {
          if (val === null || val === undefined) return null;
          return typeof val === 'string' ? val : JSON.stringify(val);
        });
      } catch (e) { return keys.map(() => null); }
    },
    async del(...keys: string[]) {
      if (!client) return 0;
      try { return await client.del(...keys); } catch(e) { return 0; }
    },
    async exists(...keys: string[]) {
      if (!client) return 0;
      try { return await client.exists(...keys); } catch(e) { return 0; }
    },
    pipeline,
  };
}

export function getRedis(): RedisClient | null {
  if (initialized) return redisClient;
  initialized = true;

  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      logger.error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production');
      return null;
    }
    logger.info('Redis: using Upstash (production)');
    redisClient = createProdRedis();
    return redisClient;
  }

  // Development: use local Redis
  const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  logger.info({ url }, 'Redis: using local Redis (development)');
  redisClient = createDevRedis(url);
  return redisClient;
}
