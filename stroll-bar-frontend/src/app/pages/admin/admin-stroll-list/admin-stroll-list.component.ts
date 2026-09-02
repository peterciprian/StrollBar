import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';

import { Stroll } from '../../../core/api/models';
import { StrollsFeatureService } from '../../../features/strolls/strolls-feature.service';

@Component({
	selector: 'app-admin-stroll-list-screen',
	standalone: true,
	imports: [CommonModule, UpperCasePipe, MatButtonModule, MatIconModule, MatTableModule, MatTooltipModule, TranslatePipe],
	templateUrl: './admin-stroll-list.component.html',
	styleUrls: ['./admin-stroll-list.component.scss']
})
export class AdminStrollListScreenComponent implements OnInit {
	private readonly router = inject(Router);
	private readonly strollsFeature = inject(StrollsFeatureService);

	protected readonly displayedColumns = ['name', 'status', 'visibility', 'stations', 'labels', 'media', 'updated', 'actions'];
	protected readonly strolls = signal<Stroll[]>([]);
	protected readonly loading = signal(true);
	protected readonly loadError = signal(false);
	protected readonly publishedCount = computed(() => this.strolls().filter((stroll) => stroll.activeStatus === 'published').length);
	protected readonly draftCount = computed(() => this.strolls().filter((stroll) => stroll.activeStatus === 'draft').length);
	protected readonly totalStages = computed(() => this.strolls().reduce((total, stroll) => total + stroll.stageCount, 0));

	ngOnInit(): void {
		this.strollsFeature.listOwned({ limit: 100 }).subscribe({
			next: (response) => {
				this.strolls.set(response.items);
				this.loading.set(false);
			},
			error: () => {
				this.loadError.set(true);
				this.loading.set(false);
			}
		});
	}

	protected createStroll(): void {
		this.router.navigate(['/creator/strolls/new']);
	}

	protected editStroll(strollId: string): void {
		this.router.navigate(['/creator/strolls', strollId]);
	}

	protected mediaCount(stroll: Stroll): number {
		return (stroll.mediaUrls?.imageUrls?.length ?? 0) + (stroll.mediaUrls?.videoUrls?.length ?? 0);
	}

	protected deleteStroll(strollId: string): void {
		this.strollsFeature.remove(strollId).subscribe({
			next: () => this.strolls.update((strolls) => strolls.filter((stroll) => stroll.id !== strollId)),
			error: () => this.loadError.set(true)
		});
	}
}
