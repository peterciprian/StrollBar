// Formats a duration as MM:SS, HH:MM:SS-style, or DD:HH:MM:SS-style text depending on scale.
export function formatDuration(totalSeconds: number, translateInstant: (key: string, params?: Record<string, unknown>) => string): string {
	const days = Math.floor(totalSeconds / 86400);
	const hours = Math.floor((totalSeconds % 86400) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	const pad = (value: number) => String(value).padStart(2, '0');

	if (days > 0) {
		return translateInstant('SCREENS.ADVENTURE_RESULT.DURATION_DHMS', { d: days, h: hours, m: minutes, s: pad(seconds) });
	}
	if (hours > 0) {
		return translateInstant('SCREENS.ADVENTURE_RESULT.DURATION_HMS', { h: hours, m: minutes, s: pad(seconds) });
	}
	return translateInstant('SCREENS.ADVENTURE_RESULT.DURATION_MS', { m: minutes, s: pad(seconds) });
}
