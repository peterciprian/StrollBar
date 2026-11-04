import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { X509Certificate } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { checkServerIdentity, ConnectionOptions } from 'node:tls';
import { DATABASE_ENTITIES } from './entities';
import { PaidGrants1754300000000 } from './migrations/1754300000000-paid-grants';
import { InitialSchema1752864000000 } from './migrations/1752864000000-initial-schema';
import { AuthTokensAndPasswordReset1752885000000 } from './migrations/1752885000000-auth-tokens-and-password-reset';
import { MediaAssets1752896000000 } from './migrations/1752896000000-media-assets';
import { SocialAuthIdentities1752907000000 } from './migrations/1752907000000-social-auth-identities';
import { EmailVerification1752918000000 } from './migrations/1752918000000-email-verification';
import { UserRoles1752929000000 } from './migrations/1752929000000-user-roles';
import { QueryPerformanceIndexes1753000000000 } from './migrations/1753000000000-query-performance-indexes';
import { AuditEvents1753100000000 } from './migrations/1753100000000-audit-events';
import { StrollCategoryPriceLength1753200000000 } from './migrations/1753200000000-stroll-category-price-length';
import { AdventureResults1753300000000 } from './migrations/1753300000000-adventure-results';
import { StrollReviews1753400000000 } from './migrations/1753400000000-stroll-reviews';
import { UserBadges1753600000000 } from './migrations/1753600000000-user-badges';
import { BadgeDefinitions1753700000000 } from './migrations/1753700000000-badge-definitions';
import { StrollReports1753800000000 } from './migrations/1753800000000-stroll-reports';
import { RiddleBadges1753900000000 } from './migrations/1753900000000-riddle-badges';
import { UserPreferredLanguage1754000000000 } from './migrations/1754000000000-user-preferred-language';
import { UserAuthVersion1754100000000 } from './migrations/1754100000000-user-auth-version';
import { SocialTransactions1754200000000 } from './migrations/1754200000000-social-transactions';

function getBoolean(value: string | undefined, fallback: boolean): boolean {
	if (value === undefined) {
		return fallback;
	}

	return value.toLowerCase() === 'true';
}

function resolveSslOption(host: string): false | Pick<ConnectionOptions, 'rejectUnauthorized' | 'ca' | 'checkServerIdentity'> {
	const value = process.env.DB_SSL;
	const caFile = process.env.DB_SSL_CA_FILE;
	const mode = value?.toLowerCase();

	if (mode === undefined || mode === 'false') {
		if (process.env.NODE_ENV === 'production') {
			throw new Error('Production requires DB_SSL=verify-full; PostgreSQL TLS cannot be disabled.');
		}
		if (caFile !== undefined) {
			throw new Error('DB_SSL_CA_FILE requires TLS to be enabled.');
		}
		return false;
	}

	if (!['verify-full', 'true', 'require'].includes(mode)) {
		throw new Error('Invalid DB_SSL: use verify-full (true/require are verifying aliases), or false outside production.');
	}

	if (!host || host.trim() !== host || /[\s/]/.test(host)) {
		throw new Error('DB_HOST must be a hostname or IP address, not a URL, when TLS is enabled.');
	}

	let ca: string | undefined;
	if (caFile !== undefined) {
		if (!caFile || caFile.trim() !== caFile) {
			throw new Error('DB_SSL_CA_FILE must be a non-empty certificate file path.');
		}
		try {
			ca = readFileSync(caFile, 'utf8');
			const certificates = ca.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);
			if (!certificates?.length || ca.replace(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g, '').trim()) {
				throw new Error('Expected only PEM certificates.');
			}
			for (const pem of certificates) {
				const certificate = new X509Certificate(pem);
				if (!certificate.ca || Date.parse(certificate.validFrom) > Date.now() || Date.parse(certificate.validTo) <= Date.now()) {
					throw new Error('Expected a currently valid CA certificate.');
				}
			}
		} catch {
			throw new Error('DB_SSL_CA_FILE must reference a readable PEM bundle of valid CA certificates.');
		}
	}

	return {
		rejectUnauthorized: true,
		...(ca === undefined ? {} : { ca }),
		// Bind verification to DB_HOST even when pg connects using a socket or IP.
		checkServerIdentity: (_servername, certificate) => checkServerIdentity(host, certificate)
	};
}

export function buildDatabaseOptions(): TypeOrmModuleOptions {
	const host = process.env.DB_HOST ?? '127.0.0.1';
	return {
		type: 'postgres',
		host,
		port: Number(process.env.DB_PORT ?? '5432'),
		username: process.env.DB_USERNAME ?? 'postgres',
		password: process.env.DB_PASSWORD ?? 'postgres',
		database: process.env.DB_NAME ?? 'strollbar',
		ssl: resolveSslOption(host),
		extra: {
			max: Number(process.env.DB_POOL_MAX ?? '50'),
			min: Number(process.env.DB_POOL_MIN ?? '2'),
			idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_TIMEOUT_MS ?? '30000'),
			connectionTimeoutMillis: Number(process.env.DB_POOL_CONNECTION_TIMEOUT_MS ?? '10000'),
			statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS ?? '30000')
		},
		autoLoadEntities: true,
		entities: [...DATABASE_ENTITIES],
		migrations: [
			InitialSchema1752864000000,
			AuthTokensAndPasswordReset1752885000000,
			MediaAssets1752896000000,
			SocialAuthIdentities1752907000000,
			EmailVerification1752918000000,
			UserRoles1752929000000,
			QueryPerformanceIndexes1753000000000,
			AuditEvents1753100000000,
			StrollCategoryPriceLength1753200000000,
			AdventureResults1753300000000,
			StrollReviews1753400000000,
			UserBadges1753600000000,
			BadgeDefinitions1753700000000,
			StrollReports1753800000000,
			RiddleBadges1753900000000,
			UserPreferredLanguage1754000000000,
			UserAuthVersion1754100000000,
			SocialTransactions1754200000000,
			PaidGrants1754300000000
		],
		migrationsRun: getBoolean(process.env.DB_MIGRATIONS_RUN, false),
		synchronize: false,
		logging: false
	};
}

export function buildDataSourceOptions(): DataSourceOptions {
	return buildDatabaseOptions() as DataSourceOptions;
}
