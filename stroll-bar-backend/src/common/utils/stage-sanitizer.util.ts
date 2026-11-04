import { StageEntity } from '../../modules/stages/entities/stage.entity';

// The riddle answer must never reach players: it powers server-side answer checking only.
export function stripRiddleAnswer<T extends Pick<StageEntity, 'riddleAnswer'>>(stage: T): Omit<T, 'riddleAnswer'> & { hasRiddle: boolean } {
	const sanitized: Partial<T> = { ...stage };
	const hasRiddle = Boolean(stage.riddleAnswer?.trim());
	delete sanitized.riddleAnswer;
	return { ...sanitized, hasRiddle } as Omit<T, 'riddleAnswer'> & { hasRiddle: boolean };
}
