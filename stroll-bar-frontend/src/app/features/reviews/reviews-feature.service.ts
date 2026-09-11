import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../core/api/api-client.service';

@Injectable({ providedIn: 'root' })
export class ReviewsFeatureService {
	private readonly api = inject(ApiClientService);

	listMine() {
		return this.api.listMyReviews();
	}

	remove(reviewId: string) {
		return this.api.deleteMyReview(reviewId);
	}
}
