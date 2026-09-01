import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { DATABASE_ENTITIES } from './entities';
import { InitialSchema1752864000000 } from './migrations/1752864000000-initial-schema';
import { AuthTokensAndPasswordReset1752885000000 } from './migrations/1752885000000-auth-tokens-and-password-reset';
import { MediaAssets1752896000000 } from './migrations/1752896000000-media-assets';
import { SocialAuthIdentities1752907000000 } from './migrations/1752907000000-social-auth-identities';
import { EmailVerification1752918000000 } from './migrations/1752918000000-email-verification';
import { UserRoles1752929000000 } from './migrations/1752929000000-user-roles';

function getBoolean(value: string | undefined, fallback: boolean): boolean {
	if (value === undefined) {
		return fallback;
	}

	return value.toLowerCase() === 'true';
}

function resolveSslOption(): boolean | { rejectUnauthorized: boolean } {
	const value = process.env.DB_SSL;

	if (value === undefined || value === '') {
		return false;
	}

	const normalized = value.toLowerCase();

	if (normalized === 'true' || normalized === 'require') {
		return { rejectUnauthorized: false };
	}

	if (normalized === 'false') {
		return false;
	}

	return { rejectUnauthorized: false };
}

export function buildDatabaseOptions(): TypeOrmModuleOptions {
	return {
		type: 'postgres',
		host: process.env.DB_HOST ?? '127.0.0.1',
		port: Number(process.env.DB_PORT ?? '5432'),
		username: process.env.DB_USERNAME ?? 'postgres',
		password: process.env.DB_PASSWORD ?? 'postgres',
		database: process.env.DB_NAME ?? 'strollbar',
		ssl: resolveSslOption(),
		autoLoadEntities: true,
		entities: [...DATABASE_ENTITIES],
		migrations: [
			InitialSchema1752864000000,
			AuthTokensAndPasswordReset1752885000000,
			MediaAssets1752896000000,
			SocialAuthIdentities1752907000000,
			EmailVerification1752918000000,
			UserRoles1752929000000
		],
		migrationsRun: getBoolean(process.env.DB_MIGRATIONS_RUN, false),
		synchronize: false,
		logging: false
	};
}

export function buildDataSourceOptions(): DataSourceOptions {
	return buildDatabaseOptions() as DataSourceOptions;
}
