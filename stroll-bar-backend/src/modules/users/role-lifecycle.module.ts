import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { RoleLifecycleDispatcher } from './role-lifecycle-dispatcher.service';

@Module({
	imports: [EmailModule],
	providers: [RoleLifecycleDispatcher],
	exports: [RoleLifecycleDispatcher]
})
export class RoleLifecycleModule {}
