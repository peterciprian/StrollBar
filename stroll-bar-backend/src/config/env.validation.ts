import { plainToInstance } from 'class-transformer';
import { IsBooleanString, IsIn, IsInt, IsOptional, IsString, IsUrl, Max, Min, validateSync } from 'class-validator';

class EnvironmentVariables {
	@IsIn(['development', 'test', 'staging', 'production'])
	NODE_ENV!: string;

	@IsString()
	JWT_SECRET!: string;

	@IsString()
	JWT_REFRESH_SECRET!: string;

	@IsInt()
	@Min(1)
	@Max(65535)
	PORT!: number;

	@IsOptional()
	@IsUrl({ require_tld: false })
	EMAIL_VERIFICATION_URL?: string;

	@IsOptional()
	@IsBooleanString()
	EMAIL_DELIVERY_ENABLED?: string;

	@IsOptional()
	@IsBooleanString()
	RECAPTCHA_ENABLED?: string;
}

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
	const ttl = Number(config.PASSWORD_RESET_TOKEN_TTL_MINUTES ?? 15);
	if (!Number.isInteger(ttl) || ttl < 1 || ttl > 1440) {
		throw new Error('Environment validation failed: PASSWORD_RESET_TOKEN_TTL_MINUTES must be an integer between 1 and 1440.');
	}
	const production = config.NODE_ENV === 'production' || config.NODE_ENV === 'staging';
	if (String(config.AUTH_EXPOSE_RESET_TOKEN ?? 'false').toLowerCase() === 'true') {
		throw new Error('Environment validation failed: AUTH_EXPOSE_RESET_TOKEN is no longer supported. Capture reset emails in tests instead.');
	}
	if (config.PASSWORD_RESET_URL) {
		let url: URL;
		try {
			url = new URL(String(config.PASSWORD_RESET_URL));
		} catch {
			throw new Error('Environment validation failed: PASSWORD_RESET_URL must be an absolute trusted frontend URL.');
		}
		if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (production && url.protocol !== 'https:')) {
			throw new Error('Environment validation failed: PASSWORD_RESET_URL requires HTTP(S), no credentials, and HTTPS in production.');
		}
		const route = url.hash ? url.hash.slice(1).split('?')[0] : url.pathname;
		if (!route.endsWith('/auth/reset-password')) {
			throw new Error('Environment validation failed: PASSWORD_RESET_URL must point to /auth/reset-password (hash routing is supported).');
		}
	} else if (production || config.EMAIL_DELIVERY_ENABLED === 'true') {
		throw new Error('Environment validation failed: PASSWORD_RESET_URL is required for password recovery.');
	}
	if (production && config.EMAIL_DELIVERY_ENABLED !== 'true') {
		throw new Error('Environment validation failed: EMAIL_DELIVERY_ENABLED=true is required for production password recovery.');
	}
	const environment = plainToInstance(EnvironmentVariables, {
		...config,
		NODE_ENV: config.NODE_ENV ?? 'development',
		PORT: Number(config.PORT ?? 3000)
	});
	const errors = validateSync(environment, { skipMissingProperties: false });
	if (errors.length > 0) {
		throw new Error(`Environment validation failed: ${errors.map((error) => Object.values(error.constraints ?? {}).join(', ')).join('; ')}`);
	}
	if (config.EMAIL_DELIVERY_ENABLED === 'true') {
		const requiredEmailKeys = ['BREVO_API_KEY', 'EMAIL_FROM'];
		const missingEmailKeys = requiredEmailKeys.filter((key) => !config[key]);
		if (missingEmailKeys.length > 0) {
			throw new Error(`Environment validation failed: missing email configuration: ${missingEmailKeys.join(', ')}`);
		}
	}
	if (config.RECAPTCHA_ENABLED === 'true' && (!config.RECAPTCHA_SECRET_KEY || String(config.RECAPTCHA_SECRET_KEY).startsWith('replace-'))) {
		throw new Error('Environment validation failed: missing captcha configuration: RECAPTCHA_SECRET_KEY');
	}
	if (config.NODE_ENV === 'production' || config.NODE_ENV === 'staging') {
		const requiredKeys = [
			'DB_HOST',
			'DB_USERNAME',
			'DB_PASSWORD',
			'DB_NAME',
			'S3_REGION',
			'S3_BUCKET_NAME',
			'S3_ACCESS_KEY_ID',
			'S3_SECRET_ACCESS_KEY',
			'S3_PUBLIC_BASE_URL'
		];
		const missingKeys = requiredKeys.filter((key) => !config[key] || String(config[key]).startsWith('replace-'));
		if (missingKeys.length > 0) {
			throw new Error(`Environment validation failed: missing production configuration: ${missingKeys.join(', ')}`);
		}
	}
	return config;
}
