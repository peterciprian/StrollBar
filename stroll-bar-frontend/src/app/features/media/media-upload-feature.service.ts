import { Injectable, inject } from '@angular/core';
import { Observable, from, switchMap } from 'rxjs';
import { ApiClientService } from '../../core/api/api-client.service';
import { InitiateMultipartUploadResponse, MediaUploadPurpose } from '../../core/api/models';

// Files at or above this size use the multipart flow; smaller files upload in a single PUT.
const MULTIPART_THRESHOLD_BYTES = 25 * 1024 * 1024;

@Injectable({ providedIn: 'root' })
export class MediaUploadFeatureService {
	private readonly api = inject(ApiClientService);

	/** Uploads a file directly to S3-compatible storage via a presigned URL and resolves to its public URL. */
	upload(file: File, purpose: MediaUploadPurpose, entityId?: string): Observable<string> {
		return file.size >= MULTIPART_THRESHOLD_BYTES
			? this.uploadMultipart(file, purpose, entityId)
			: this.uploadSinglePart(file, purpose, entityId);
	}

	private uploadSinglePart(file: File, purpose: MediaUploadPurpose, entityId?: string): Observable<string> {
		return this.api.presignUpload({ fileName: file.name, contentType: file.type, sizeBytes: file.size, purpose, entityId }).pipe(
			switchMap((presigned) =>
				from(
					fetch(presigned.uploadUrl, { method: 'PUT', headers: presigned.headers, body: file }).then((response) => {
						if (!response.ok) {
							throw new Error(`Upload to storage failed with status ${response.status}.`);
						}

						return presigned.publicUrl;
					})
				)
			)
		);
	}

	private uploadMultipart(file: File, purpose: MediaUploadPurpose, entityId?: string): Observable<string> {
		return this.api
			.initiateMultipartUpload({ fileName: file.name, contentType: file.type, sizeBytes: file.size, purpose, entityId })
			.pipe(
				switchMap((initiated) =>
					from(this.uploadParts(file, initiated)).pipe(
						switchMap((parts) =>
							this.api
								.completeMultipartUpload({ assetId: initiated.assetId, uploadId: initiated.uploadId, parts })
								.pipe(switchMap(() => from(Promise.resolve(initiated.publicUrl))))
						)
					)
				)
			);
	}

	private async uploadParts(file: File, initiated: InitiateMultipartUploadResponse): Promise<Array<{ partNumber: number; etag: string }>> {
		const completedParts: Array<{ partNumber: number; etag: string }> = [];

		for (const part of initiated.parts) {
			const start = (part.partNumber - 1) * initiated.partSizeBytes;
			const chunk = file.slice(start, start + initiated.partSizeBytes);
			const response = await fetch(part.uploadUrl, { method: 'PUT', body: chunk });

			if (!response.ok) {
				throw new Error(`Upload of part ${part.partNumber} failed with status ${response.status}.`);
			}

			completedParts.push({ partNumber: part.partNumber, etag: response.headers.get('ETag') ?? '' });
		}

		return completedParts;
	}
}
