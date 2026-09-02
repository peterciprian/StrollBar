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
}

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
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
		const requiredEmailKeys = ['SMTP_HOST', 'SMTP_FROM'];
		const missingEmailKeys = requiredEmailKeys.filter((key) => !config[key]);
		if (missingEmailKeys.length > 0) {
			throw new Error(`Environment validation failed: missing email configuration: ${missingEmailKeys.join(', ')}`);
		}
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
