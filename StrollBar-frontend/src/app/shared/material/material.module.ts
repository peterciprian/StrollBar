import { NgModule } from '@angular/core';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconRegistry } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatRadioModule } from '@angular/material/radio';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@NgModule({
  imports: [
    MatGridListModule,
    MatButtonModule,
    MatTabsModule,
    MatToolbarModule,
    MatCardModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
    MatRadioModule,
    MatSidenavModule,
    MatListModule,
    MatButtonToggleModule,
    MatSlideToggleModule,
    MatExpansionModule,
    MatDividerModule,
    MatTableModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatProgressBarModule,
    MatBottomSheetModule,
    MatDatepickerModule,
    MatChipsModule
  ],
  exports: [
    MatGridListModule,
    MatButtonModule,
    MatTabsModule,
    MatToolbarModule,
    MatCardModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
    MatRadioModule,
    MatSidenavModule,
    MatListModule,
    MatButtonToggleModule,
    MatSlideToggleModule,
    MatExpansionModule,
    MatDividerModule,
    MatTableModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatProgressBarModule,
    MatBottomSheetModule,
    MatDatepickerModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  providers: [
    MatIconRegistry
  ]
})

export class MaterialModule { }
