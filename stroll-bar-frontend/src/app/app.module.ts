import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { LocationStrategy, HashLocationStrategy } from '@angular/common';
import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { InterceptorService } from './core/services/interceptor.service';

@NgModule({
	declarations: [],
	imports: [BrowserModule, CoreModule.forRoot(), AppComponent],
	providers: [
		{
			provide: HTTP_INTERCEPTORS,
			useClass: InterceptorService,
			multi: true
		},
		{ provide: LocationStrategy, useClass: HashLocationStrategy }
	]
})
export class AppModule {}
