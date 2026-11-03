import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class SocialHandoffDto {
	@ApiProperty({ description: 'Opaque, single-use callback handoff code.' })
	@IsString()
	@Matches(/^[a-f0-9]{64}$/)
	code!: string;

	@ApiProperty({ description: 'Transaction returned by social initiation.' })
	@IsString()
	@Matches(/^[a-f0-9]{64}$/)
	transactionId!: string;

	@ApiProperty({ description: 'Secret held only by the initiating browser tab.' })
	@IsString()
	@Matches(/^[a-f0-9]{64}$/)
	verifier!: string;
}
