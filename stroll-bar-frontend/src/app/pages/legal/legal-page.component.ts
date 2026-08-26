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
			{ headingKey: 'LEGAL.IMPRINT.CONTACT_HEADING', bodyKey: 'LEGAL.IMPRINT.CONTACT_BODY' },
			{ headingKey: 'LEGAL.IMPRINT.RESPONSIBLE_HEADING', bodyKey: 'LEGAL.IMPRINT.RESPONSIBLE_BODY' }
		]
	},
	privacy: {
		titleKey: 'LEGAL.PRIVACY.TITLE',
		updatedKey: 'LEGAL.PRIVACY.UPDATED',
		sections: [
			{ headingKey: 'LEGAL.PRIVACY.SCOPE_HEADING', bodyKey: 'LEGAL.PRIVACY.SCOPE_BODY' },
			{ headingKey: 'LEGAL.PRIVACY.DATA_HEADING', bodyKey: 'LEGAL.PRIVACY.DATA_BODY' },
			{ headingKey: 'LEGAL.PRIVACY.PURPOSE_HEADING', bodyKey: 'LEGAL.PRIVACY.PURPOSE_BODY' },
			{ headingKey: 'LEGAL.PRIVACY.PROVIDERS_HEADING', bodyKey: 'LEGAL.PRIVACY.PROVIDERS_BODY' },
			{ headingKey: 'LEGAL.PRIVACY.RETENTION_HEADING', bodyKey: 'LEGAL.PRIVACY.RETENTION_BODY' },
			{ headingKey: 'LEGAL.PRIVACY.RIGHTS_HEADING', bodyKey: 'LEGAL.PRIVACY.RIGHTS_BODY' }
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
