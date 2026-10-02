import { registerLocaleData } from '@angular/common';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { aplicarTemaInicial } from './app/services/tema.service';
import localeEs from '@angular/common/locales/es';

registerLocaleData(localeEs);

// Antes de bootstrap: si el tema se aplicara después, la app parpadearía en claro.
aplicarTemaInicial();

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
