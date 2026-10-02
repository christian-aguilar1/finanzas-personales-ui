import { DOCUMENT, inject, Injectable, signal } from '@angular/core';

const CLAVE = 'finanzas-personales-ui:tema';

export type Tema = 'claro' | 'oscuro';

/**
 * El tema vive en `<html data-theme="oscuro">` para que los tokens de
 * `styles.css` los resuelvan los componentes sin necesitar nada de Angular.
 * El valor elegido se guarda en localStorage; si nunca se eligió, manda la
 * preferencia del sistema.
 */
@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly document = inject(DOCUMENT);

  private readonly oscuro = signal(false);

  readonly esOscuro = this.oscuro.asReadonly();

  constructor() {
    this.aplicar(this.leerGuardado());
  }

  alternar(): void {
    this.oscuro.update((oscuro) => !oscuro);
    this.persistir(this.oscuro() ? 'oscuro' : 'claro');
    this.reflejarEnElDocumento();
  }

  /**
   * Se ejecuta en `main.ts` antes de `bootstrapApplication`: si el tema se
   * aplicara después, la página aparecería en claro y luego parpadearía.
   */
  aplicarDesdeAlmacenamiento(): void {
    this.aplicar(this.leerGuardado());
  }

  private aplicar(tema: Tema): void {
    this.oscuro.set(tema === 'oscuro');
    this.reflejarEnElDocumento();
  }

  private reflejarEnElDocumento(): void {
    const raiz = this.document.documentElement;
    if (this.oscuro()) {
      raiz.dataset['theme'] = 'oscuro';
      raiz.classList.add('app-dark');
    } else {
      delete raiz.dataset['theme'];
      raiz.classList.remove('app-dark');
    }
  }

  private leerGuardado(): Tema {
    const guardado = this.almacen()?.getItem(CLAVE);
    if (guardado === 'oscuro' || guardado === 'claro') {
      return guardado;
    }
    return this.prefiereOscuro() ? 'oscuro' : 'claro';
  }

  private persistir(tema: Tema): void {
    try {
      this.almacen()?.setItem(CLAVE, tema);
    } catch {
      // Modo privado o storage bloqueado: el tema igual funciona en la sesión.
    }
  }

  private almacen(): Storage | null {
    try {
      return this.document.defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  }

  private prefiereOscuro(): boolean {
    return this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }
}

/** Variante sin dependencias, para correr antes de que exista el injector. */
export function aplicarTemaInicial(): void {
  let guardado: string | null = null;
  try {
    guardado = localStorage.getItem(CLAVE);
  } catch {
    guardado = null;
  }

  const oscuro =
    guardado === 'oscuro' ||
    (guardado !== 'claro' && matchMedia('(prefers-color-scheme: dark)').matches);

  if (oscuro) {
    document.documentElement.dataset['theme'] = 'oscuro';
    document.documentElement.classList.add('app-dark');
  }
}
