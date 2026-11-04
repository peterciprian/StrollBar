import 'reflect-metadata';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDatabaseOptions } from '../database/database.config';
import { RoleLifecycleDispatcher } from '../modules/users/role-lifecycle-dispatcher.service';
import { RoleLifecycleModule } from '../modules/users/role-lifecycle.module';

// No HTTP server, JWT/authorization, or request-time expiry dependency.
@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true, envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'] }),
		TypeOrmModule.forRootAsync({ useFactory: () => ({ ...buildDatabaseOptions(), migrationsRun: false }) }),
		RoleLifecycleModule
	]
})
export class RoleLifecycleJobModule {}

export async function runRoleLifecycleJob(): Promise<void> {
	const app = await NestFactory.createApplicationContext(RoleLifecycleJobModule);
	try {
		const result = await app.get(RoleLifecycleDispatcher).drain();
		if (result.retry || result.exhausted) process.exitCode = 1;
	} finally {
		await app.close();
	}
}

if (require.main === module) {
	void runRoleLifecycleJob().catch(() => {
		new Logger('RoleLifecycleJob').error({
			event: 'role_mail_job_failed',
			message: 'Job startup or database operation failed; inspect configuration and database availability.'
		});
		process.exitCode = 1;
	});
}
