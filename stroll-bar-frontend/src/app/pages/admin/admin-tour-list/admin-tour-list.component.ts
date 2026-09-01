import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';

import { Stroll } from '../../../core/api/models';
import { StrollsFeatureService } from '../../../features/strolls/strolls-feature.service';

@Component({
	selector: 'app-admin-tour-list-screen',
	standalone: true,
	imports: [CommonModule, UpperCasePipe, MatButtonModule, MatIconModule, MatTableModule, MatChipsModule, MatTooltipModule, TranslatePipe],
	templateUrl: './admin-tour-list.component.html',
	styleUrls: ['./admin-tour-list.component.scss']
})
export class AdminTourListScreenComponent implements OnInit {
	private readonly router = inject(Router);
	private readonly strollsFeature = inject(StrollsFeatureService);

	protected readonly displayedColumns = ['name', 'stations', 'labels', 'visibility', 'status', 'actions'];
	protected readonly tours = signal<Stroll[]>([]);
	protected readonly loading = signal(true);
	protected readonly loadError = signal(false);

	ngOnInit(): void {
		this.strollsFeature.listOwned({ limit: 100 }).subscribe({
			next: (response) => {
				this.tours.set(response.items);
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

	protected deleteStroll(strollId: string): void {
		this.strollsFeature.remove(strollId).subscribe({
			next: () => this.tours.update((tours) => tours.filter((tour) => tour.id !== strollId)),
			error: () => this.loadError.set(true)
		});
	}
}
