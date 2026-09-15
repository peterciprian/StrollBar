import { StageEntity } from '../../modules/stages/entities/stage.entity';

// The riddle answer must never reach players: it powers server-side answer checking only.
export function stripRiddleAnswer<T extends Pick<StageEntity, 'riddleAnswer'>>(stage: T): Omit<T, 'riddleAnswer'> {
	const sanitized: Partial<T> = { ...stage };
	delete sanitized.riddleAnswer;
	return sanitized as Omit<T, 'riddleAnswer'>;
}
