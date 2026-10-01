import {
  ApplicationConfig,
  LOCALE_ID,
  provideZoneChangeDetection
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import {provideHttpClient, withFetch, withInterceptors} from '@angular/common/http';
import {provideAnimations} from '@angular/platform-browser/animations';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {authHttpInterceptorFn, provideAuth0} from '@auth0/auth0-angular';
import {providePrimeNG} from 'primeng/config';
import Lara from '@primeuix/themes/lara';

import { environment } from '../environments/environment';
import { unauthorizedInterceptorFn } from './services/unauthorized.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAuth0({
      domain: environment.auth0.domain,
      clientId: environment.auth0.clientId,
      authorizationParams: {
        redirect_uri: `${window.location.origin}/callback`,
        audience: environment.auth0.audience
      },
      // CRÍTICO: la API vive en otro origin. Sin esta URL el SDK no adjunta el
      // access token, todo responde 401 y parece un problema de audience.
      // El '*' final es obligatorio: el matcher del SDK compara con igualdad
      // exacta salvo que el valor termine en asterisco, y sin él /cuentas,
      // /transacciones, etc. nunca matchean contra el apiUrl base.
      httpInterceptor: {
        allowedList: [`${environment.apiUrl}/*`]
      }
    }),
    provideHttpClient(withFetch(), withInterceptors([authHttpInterceptorFn, unauthorizedInterceptorFn])),
    provideAnimations(),
    provideAnimationsAsync(),
    { provide: LOCALE_ID, useValue: 'es' },
    providePrimeNG({
      theme: {
        preset: Lara,
        options: {
          inputBackground: '#ffffff',
          inputTextColor: '#212121',
          inputBorderColor: '#ced4da'
        }
      }
    })
  ]
};
