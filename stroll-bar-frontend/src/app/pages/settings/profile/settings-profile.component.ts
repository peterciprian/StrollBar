import { Component } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
	selector: 'app-settings-profile',
	standalone: true,
	imports: [UpperCasePipe, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, TranslatePipe],
	templateUrl: './settings-profile.component.html',
	styleUrls: ['./settings-profile.component.scss']
})
export class SettingsProfileComponent {}
