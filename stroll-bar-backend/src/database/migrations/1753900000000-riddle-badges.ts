import { MigrationInterface, QueryRunner } from 'typeorm';

const RIDDLE_BADGES = [
	{
		code: 'RIDDLE_SOLVER',
		icon: 'psychology',
		title: 'Riddle Solver',
		description: 'Answered 25 riddles correctly.',
		rules: [{ metric: 'correctRiddleAnswersCount', operator: 'gte', value: 25 }]
	},
	{
		code: 'RIDDLE_MASTER',
		icon: 'emoji_objects',
		title: 'Riddle Master',
		description: 'Answered 100 riddles correctly.',
		rules: [{ metric: 'correctRiddleAnswersCount', operator: 'gte', value: 100 }]
	}
];

export class RiddleBadges1753900000000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		for (const badge of RIDDLE_BADGES) {
			await queryRunner.query(`INSERT INTO badge_definitions (code, icon, title, description, rules) VALUES ($1, $2, $3, $4, $5::jsonb)`, [
				badge.code,
				badge.icon,
				badge.title,
				badge.description,
				JSON.stringify(badge.rules)
			]);
		}
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`DELETE FROM badge_definitions WHERE code IN ($1, $2)`,
			RIDDLE_BADGES.map((badge) => badge.code)
		);
	}
}
