export const environment = {
	production: true,
	baseApiUrl: 'https://stroll-bar-n5zc.onrender.com/v1',
	recaptchaSiteKey: '6LeME7stAAAAAFF1UszwcLrliwq3AG2ZPZIDDAIl',
	// Mirrors the backend's MEDIA_MAX_IMAGE_SIZE_BYTES/MEDIA_MAX_VIDEO_SIZE_BYTES; keep both in sync.
	mediaLimits: {
		maxImageSizeBytes: 4 * 1024 * 1024,
		maxVideoSizeBytes: 20 * 1024 * 1024
	}
};
