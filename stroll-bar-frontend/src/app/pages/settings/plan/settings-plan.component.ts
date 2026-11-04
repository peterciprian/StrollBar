import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { UserEntitlement } from '../../../core/api/models';
import { ApiClientService } from '../../../core/api/api-client.service';
import { UserRole } from '../../../core/models/user-role.enum';
import { SbAlertComponent } from '../../../components/atoms/sb-alert/sb-alert.component';
import { SbPageHeaderComponent } from '../../../components/atoms/sb-page-header/sb-page-header.component';
import { SbButtonComponent } from '../../../components/atoms/sb-button/sb-button.component';

@Component({
	selector: 'app-settings-plan',
	standalone: true,
	imports: [DatePipe, TranslatePipe, SbAlertComponent, SbPageHeaderComponent, SbButtonComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './settings-plan.component.html',
	styleUrl: './settings-plan.component.scss'
})
export class SettingsPlanComponent implements OnInit {
	private readonly api = inject(ApiClientService);

	protected readonly entitlement = signal<UserEntitlement | null>(null);
	protected readonly loading = signal(true);
	protected readonly loadError = signal(false);
	protected readonly userRole = UserRole;
	protected readonly cancelling = signal<string | null>(null);
	protected readonly cancelError = signal(false);

	ngOnInit(): void {
		this.loadEntitlement();
	}

	protected cancelGrant(grantId: string): void {
		if (this.cancelling()) return;
		this.cancelError.set(false);
		this.cancelling.set(grantId);
		this.api.cancelMyPaidGrant(grantId).subscribe({
			next: () => {
				this.cancelling.set(null);
				this.loadEntitlement();
			},
			error: () => {
				this.cancelError.set(true);
				this.cancelling.set(null);
			}
		});
	}

	private loadEntitlement(): void {
		this.api.getMyEntitlement().subscribe({
			next: (entitlement) => {
				this.entitlement.set(entitlement);
				this.loading.set(false);
			},
			error: () => {
				this.loadError.set(true);
				this.loading.set(false);
			}
		});
	}
}
