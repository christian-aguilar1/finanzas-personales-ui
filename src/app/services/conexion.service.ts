import { DOCUMENT, inject, Injectable, signal } from '@angular/core';
import { fromEvent, map, merge } from 'rxjs';

/**
 * Estado de la conexión a la red, para poder avisar cuando el dispositivo no
 * tiene salida a internet.
 *
 * <p>Se apoya en `navigator.onLine` y los eventos `online`/`offline`. Ojo con el
 * alcance de esa API: informa si hay interfaz de red activa, **no** si el backend
 * responde. Con WiFi conectado y el servidor caído, esta señal sigue en "conectado"
 * y el error real llega como `status 0` en la respuesta (ver `esErrorDeRed`).
 *
 * <p>Por diseño la app no cachea datos: cuando se pierde la conexión, el service
 * worker sigue sirviendo el shell pero las peticiones a la API fallan. Este
 * servicio es el que convierte ese fallo silencioso en un aviso visible.
 */
@Injectable({ providedIn: 'root' })
export class ConexionService {
  private readonly document = inject(DOCUMENT);

  private readonly online = signal(this.leerEstadoInicial());

  /** `true` mientras el navegador tenga interfaz de red. */
  readonly hayConexion = this.online.asReadonly();

  /** Inverso de `hayConexion`, para el `@if` del banner. */
  readonly sinConexion = signal(false);

  constructor() {
    this.sinConexion.set(!this.online());

    const ventana = this.document.defaultView;
    if (!ventana) {
      // Fuera del navegador (tests, SSR): no hay eventos que escuchar.
      return;
    }

    merge(
      fromEvent(ventana, 'online').pipe(map(() => true)),
      fromEvent(ventana, 'offline').pipe(map(() => false)),
    )
      // El servicio es root y no se destruye hasta que se cae la app, asi que la
      // suscripcion vive lo mismo. `startWith` no hace falta: el estado inicial ya
      // quedo aplicado en el signal antes de suscribirse.
      .subscribe((hayConexion: boolean) => {
        this.online.set(hayConexion);
        this.sinConexion.set(!hayConexion);
      });
  }

  /**
   * Un `HttpErrorResponse` con `status === 0` es la señal que el navegador emite
   * cuando la peticion no llego al servidor: sin red, con el host caido o con CORS
   * bloqueado. Es distinta de un 4xx o 5xx, que si explican que paso.
   */
  esErrorDeRed(status: number | undefined): boolean {
    return status === 0;
  }

  private leerEstadoInicial(): boolean {
    const ventana = this.document.defaultView;
    // Sin `navigator.onLine` (o sin ventana) se asume conexion: preferimos no mostrar
    // un banner de "sin conexion" cuando el navegador no nos da la señal.
    return ventana?.navigator?.onLine ?? true;
  }
}
