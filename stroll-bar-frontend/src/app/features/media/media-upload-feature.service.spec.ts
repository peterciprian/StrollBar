import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { MockedFunction } from 'jest-mock';
import { firstValueFrom, of } from 'rxjs';
import { ApiClientService } from '../../core/api/api-client.service';
import { MediaUploadFeatureService } from './media-upload-feature.service';

type FetchResponse = { ok: boolean; status?: number; headers?: { get(name: string): string | null } };

describe('MediaUploadFeatureService', () => {
	let api: {
		presignUpload: jest.Mock;
		initiateMultipartUpload: jest.Mock;
		completeMultipartUpload: jest.Mock;
	};
	let fetchMock: MockedFunction<(input: RequestInfo | URL, init?: RequestInit) => Promise<FetchResponse>>;

	beforeEach(() => {
		api = {
			presignUpload: jest.fn(),
			initiateMultipartUpload: jest.fn(),
			completeMultipartUpload: jest.fn()
		};
		fetchMock = jest.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<FetchResponse>>();
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		TestBed.configureTestingModule({
			providers: [MediaUploadFeatureService, { provide: ApiClientService, useValue: api }]
		});
	});

	it('uploads small files with a single presigned PUT request', async () => {
		const file = new File(['image-bytes'], 'cover.jpg', { type: 'image/jpeg' });
		api.presignUpload.mockReturnValue(
			of({
				uploadUrl: 'https://storage.example.com/upload',
				publicUrl: 'https://cdn.example.com/cover.jpg',
				headers: { 'Content-Type': 'image/jpeg' }
			})
		);
		fetchMock.mockResolvedValue({ ok: true });
		const service = TestBed.inject(MediaUploadFeatureService);

		await expect(firstValueFrom(service.upload(file, 'stroll', 'stroll-1'))).resolves.toBe('https://cdn.example.com/cover.jpg');
		expect(api.presignUpload).toHaveBeenCalledWith({
			fileName: 'cover.jpg',
			contentType: 'image/jpeg',
			sizeBytes: file.size,
			purpose: 'stroll',
			entityId: 'stroll-1'
		});
		expect(fetchMock).toHaveBeenCalledWith('https://storage.example.com/upload', {
			method: 'PUT',
			headers: { 'Content-Type': 'image/jpeg', 'ngsw-bypass': 'true' },
			body: file
		});
	});

	it('throws when a single-part upload fails in storage', async () => {
		const file = new File(['image-bytes'], 'cover.jpg', { type: 'image/jpeg' });
		api.presignUpload.mockReturnValue(
			of({ uploadUrl: 'https://storage.example.com/upload', publicUrl: 'https://cdn.example.com/cover.jpg', headers: {} })
		);
		fetchMock.mockResolvedValue({ ok: false, status: 503 });
		const service = TestBed.inject(MediaUploadFeatureService);

		await expect(firstValueFrom(service.upload(file, 'stroll'))).rejects.toThrow('Upload to storage failed with status 503.');
	});

	it('uploads large files with multipart upload and completes with sorted etags', async () => {
		const file = {
			name: 'walkthrough.mp4',
			type: 'video/mp4',
			size: 26 * 1024 * 1024,
			slice: jest.fn((start: number, end: number) => new Blob([`chunk-${start}-${end}`], { type: 'video/mp4' }))
		} as unknown as File;
		api.initiateMultipartUpload.mockReturnValue(
			of({
				assetId: 'asset-1',
				uploadId: 'upload-1',
				publicUrl: 'https://cdn.example.com/walkthrough.mp4',
				partSizeBytes: 5,
				parts: [
					{ partNumber: 1, uploadUrl: 'https://storage.example.com/part-1' },
					{ partNumber: 2, uploadUrl: 'https://storage.example.com/part-2' }
				]
			})
		);
		api.completeMultipartUpload.mockReturnValue(of({ assetId: 'asset-1', publicUrl: 'https://cdn.example.com/walkthrough.mp4' }));
		fetchMock
			.mockResolvedValueOnce({ ok: true, headers: { get: jest.fn(() => 'etag-1') } })
			.mockResolvedValueOnce({ ok: true, headers: { get: jest.fn(() => 'etag-2') } });
		const service = TestBed.inject(MediaUploadFeatureService);

		await expect(firstValueFrom(service.upload(file, 'stage', 'stage-1'))).resolves.toBe('https://cdn.example.com/walkthrough.mp4');
		expect(api.initiateMultipartUpload).toHaveBeenCalledWith({
			fileName: 'walkthrough.mp4',
			contentType: 'video/mp4',
			sizeBytes: file.size,
			purpose: 'stage',
			entityId: 'stage-1'
		});
		expect(api.completeMultipartUpload).toHaveBeenCalledWith({
			assetId: 'asset-1',
			uploadId: 'upload-1',
			parts: [
				{ partNumber: 1, etag: 'etag-1' },
				{ partNumber: 2, etag: 'etag-2' }
			]
		});
	});
});
