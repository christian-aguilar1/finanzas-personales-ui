import {
  ApplicationConfig,
  isDevMode,
  LOCALE_ID,
  provideZoneChangeDetection
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import {provideHttpClient, withFetch, withInterceptors} from '@angular/common/http';
import {provideAnimations} from '@angular/platform-browser/animations';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {authHttpInterceptorFn, provideAuth0} from '@auth0/auth0-angular';
import {providePrimeNG} from 'primeng/config';
import {MessageService} from 'primeng/api';
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
    // PWA instalable (sin cache de datos): el service worker solo sirve el shell y
    // los assets, nunca /api/**, asi que ningun dato financiero queda en el disco
    // del dispositivo. ngsw-config.json no define dataGroups justamente por eso.
    provideServiceWorker('ngsw-worker.js', {
      // Nunca en desarrollo: un SW cacheando ng serve rompe el hot reload.
      enabled: !isDevMode(),
      // Espera a que la app se estabilice; los 30s de gracia evitan que compita
      // con el bootstrap en conexiones lentas sin bloquear la primera carga.
      registrationStrategy: 'registerWhenStable:30000'
    }),
    { provide: LOCALE_ID, useValue: 'es' },
    // MessageService no es `providedIn: 'root'` en PrimeNG, hay que registrarlo.
    // Va aqui y no en `App` a proposito: los interceptores HTTP corren en el
    // injector de aplicacion, asi que desde ahi no verian el provider del
    // componente. Y si quedara en `App` serian dos instancias distintas: el
    // <p-toast> escucharia una y los `add()` del interceptor irian a otra, asi
    // que los avisos de error de red no se verian nunca.
    MessageService,
    providePrimeNG({
      theme: {
        preset: Lara,
        options: {
          // PrimeNG enciende su paleta oscura con esta clase en <html>, que es
          // la que escribe TemaService. Los overrides de input que había
          // (fijos en claro) se quitaron: con ellos el toast y los p-input se
          // quedaban claros dentro del tema oscuro.
          darkModeSelector: '.app-dark'
        }
      }
    })
  ]
};
