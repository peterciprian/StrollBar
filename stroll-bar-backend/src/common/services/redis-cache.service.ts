import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
	private readonly logger = new Logger(RedisCacheService.name);
	private readonly client?: RedisClientType;
	private hits = 0;
	private misses = 0;

	constructor(configService: ConfigService) {
		const url = configService.get<string>('REDIS_URL');
		if (url) {
			this.client = createClient({ url });
			this.client.on('error', (error) => this.logger.error('Redis cache error.', error));
			void this.client.connect().catch((error) => this.logger.error('Redis cache connection failed.', error));
		}
	}

	async get<T>(key: string): Promise<T | undefined> {
		if (!this.client) {
			this.misses += 1;
			return undefined;
		}
		try {
			const value = await this.client.get(key);
			if (!value) {
				this.misses += 1;
				return undefined;
			}
			this.hits += 1;
			return JSON.parse(value) as T;
		} catch (error) {
			this.logger.warn(`Redis cache read failed for ${key}.`);
			this.misses += 1;
			return undefined;
		}
	}

	async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
		if (!this.client) return;
		try {
			await this.client.set(key, JSON.stringify(value), { EX: ttlSeconds });
		} catch {
			this.logger.warn(`Redis cache write failed for ${key}.`);
		}
	}

	async deleteByPrefix(prefix: string): Promise<void> {
		if (!this.client) return;
		try {
			for await (const key of this.client.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 })) {
				await this.client.del(key);
			}
		} catch {
			this.logger.warn(`Redis cache invalidation failed for ${prefix}.`);
		}
	}

	getStats() {
		return { enabled: !!this.client, hits: this.hits, misses: this.misses };
	}

	async onModuleDestroy(): Promise<void> {
		if (this.client?.isOpen) await this.client.quit();
	}
}
