import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

type LegalDocument = 'imprint' | 'privacy' | 'terms';

interface LegalSection {
	headingKey: string;
	bodyKey: string;
}

const DOCUMENTS: Record<LegalDocument, { titleKey: string; updatedKey: string; sections: LegalSection[] }> = {
	imprint: {
		titleKey: 'LEGAL.IMPRINT.TITLE',
		updatedKey: 'LEGAL.IMPRINT.UPDATED',
		sections: [
			{ headingKey: 'LEGAL.IMPRINT.OPERATOR_HEADING', bodyKey: 'LEGAL.IMPRINT.OPERATOR_BODY' },
			{ headingKey: 'LEGAL.IMPRINT.RESPONSIBLE_HEADING', bodyKey: 'LEGAL.IMPRINT.RESPONSIBLE_BODY' },
			{ headingKey: 'LEGAL.IMPRINT.COPYRIGHT_HEADING', bodyKey: 'LEGAL.IMPRINT.COPYRIGHT_BODY' },
			{ headingKey: 'LEGAL.IMPRINT.HOSTING_PROVIDER_HEADING', bodyKey: 'LEGAL.IMPRINT.HOSTING_PROVIDER_BODY' }
		]
	},
	privacy: {
		titleKey: 'LEGAL.PRIVACY.TITLE',
		updatedKey: 'LEGAL.PRIVACY.UPDATED',
		sections: [
			{ headingKey: 'LEGAL.PRIVACY.CONTROLLER_HEADING', bodyKey: 'LEGAL.PRIVACY.CONTROLLER_BODY' },
			{ headingKey: 'LEGAL.PRIVACY.SCOPE_HEADING', bodyKey: 'LEGAL.PRIVACY.SCOPE_BODY' },
			{ headingKey: 'LEGAL.PRIVACY.DATA_HEADING', bodyKey: 'LEGAL.PRIVACY.DATA_BODY' },
			{ headingKey: 'LEGAL.PRIVACY.PURPOSE_HEADING', bodyKey: 'LEGAL.PRIVACY.PURPOSE_BODY' },
			{ headingKey: 'LEGAL.PRIVACY.BASES_HEADING', bodyKey: 'LEGAL.PRIVACY.BASES_BODY' },
			{ headingKey: 'LEGAL.PRIVACY.SHARING_HEADING', bodyKey: 'LEGAL.PRIVACY.SHARING_BODY' },
			{ headingKey: 'LEGAL.PRIVACY.TRANSFERS_HEADING', bodyKey: 'LEGAL.PRIVACY.TRANSFERS_BODY' },
			{ headingKey: 'LEGAL.PRIVACY.COOKIES_HEADING', bodyKey: 'LEGAL.PRIVACY.COOKIES_BODY' },
			{ headingKey: 'LEGAL.PRIVACY.RETENTION_HEADING', bodyKey: 'LEGAL.PRIVACY.RETENTION_BODY' },
			{ headingKey: 'LEGAL.PRIVACY.RIGHTS_HEADING', bodyKey: 'LEGAL.PRIVACY.RIGHTS_BODY' },
			{ headingKey: 'LEGAL.PRIVACY.CHILDREN_HEADING', bodyKey: 'LEGAL.PRIVACY.CHILDREN_BODY' },
			{ headingKey: 'LEGAL.PRIVACY.AUTOMATED_HEADING', bodyKey: 'LEGAL.PRIVACY.AUTOMATED_BODY' },
			{ headingKey: 'LEGAL.PRIVACY.SECURITY_HEADING', bodyKey: 'LEGAL.PRIVACY.SECURITY_BODY' },
			{ headingKey: 'LEGAL.PRIVACY.CHANGES_HEADING', bodyKey: 'LEGAL.PRIVACY.CHANGES_BODY' },
			{ headingKey: 'LEGAL.PRIVACY.CONTACT_HEADING', bodyKey: 'LEGAL.PRIVACY.CONTACT_BODY' }
		]
	},
	terms: {
		titleKey: 'LEGAL.TERMS.TITLE',
		updatedKey: 'LEGAL.TERMS.UPDATED',
		sections: [
			{ headingKey: 'LEGAL.TERMS.SERVICE_HEADING', bodyKey: 'LEGAL.TERMS.SERVICE_BODY' },
			{ headingKey: 'LEGAL.TERMS.ACCOUNTS_HEADING', bodyKey: 'LEGAL.TERMS.ACCOUNTS_BODY' },
			{ headingKey: 'LEGAL.TERMS.CONTENT_HEADING', bodyKey: 'LEGAL.TERMS.CONTENT_BODY' },
			{ headingKey: 'LEGAL.TERMS.ACCEPTABLE_USE_HEADING', bodyKey: 'LEGAL.TERMS.ACCEPTABLE_USE_BODY' },
			{ headingKey: 'LEGAL.TERMS.AVAILABILITY_HEADING', bodyKey: 'LEGAL.TERMS.AVAILABILITY_BODY' },
			{ headingKey: 'LEGAL.TERMS.CHANGES_HEADING', bodyKey: 'LEGAL.TERMS.CHANGES_BODY' }
		]
	}
};

@Component({
	selector: 'app-legal-page',
	standalone: true,
	imports: [RouterLink, TranslatePipe],
	styleUrl: './legal-page.component.scss',
	template: `
		<article class="legal-page">
			<header class="legal-page__header">
				<a class="legal-page__back" routerLink="/">{{ 'LEGAL.BACK_HOME' | translate }}</a>
				<h1>{{ document.titleKey | translate }}</h1>
				<p>{{ document.updatedKey | translate }}</p>
			</header>
			<div class="legal-page__body">
				@for (section of document.sections; track section.headingKey) {
					<section>
						<h2>{{ section.headingKey | translate }}</h2>
						<p>{{ section.bodyKey | translate }}</p>
					</section>
				}
			</div>
		</article>
	`
})
export class LegalPageComponent {
	private readonly route = inject(ActivatedRoute);
	protected readonly document = DOCUMENTS[this.route.snapshot.data['document'] as LegalDocument] ?? DOCUMENTS.privacy;
}
