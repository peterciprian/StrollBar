import { StageEntity } from '../../modules/stages/entities/stage.entity';
import { stripRiddleAnswer } from './stage-sanitizer.util';

describe('stripRiddleAnswer', () => {
	it.each(['sanitizer-secret', null, undefined])('omits the answer property without mutating the stage (%s)', (answer) => {
		const stage = Object.assign(new StageEntity(), {
			id: 'stage-1',
			name: 'A stage',
			description: 'Solve the riddle.',
			riddleAnswer: answer
		});

		const sanitized = stripRiddleAnswer(stage);

		expect(sanitized).toEqual({ id: 'stage-1', name: 'A stage', description: 'Solve the riddle.' });
		expect(sanitized).not.toHaveProperty('riddleAnswer');
		expect(sanitized).not.toBe(stage);
		expect(stage.riddleAnswer).toBe(answer);
		expect(stage).toHaveProperty('riddleAnswer');
		expect(JSON.stringify(sanitized)).not.toContain('riddleAnswer');
		expect(JSON.stringify(sanitized)).not.toContain('sanitizer-secret');
	});
});
