import { TestBed } from '@angular/core/testing';
import { TemaService } from './tema.service';

describe('TemaService', () => {
  const CLAVE = 'finanzas-personales-ui:tema';

  /**
   * El navegador de los tests reporta `prefers-color-scheme: dark`, así que la
   * preferencia hay que fijarla a mano para no depender del entorno.
   */
  function preferenciaDelSistema(oscuro: boolean): void {
    spyOn(window, 'matchMedia').and.callFake(
      (consulta: string) =>
        ({
          matches: oscuro && consulta.includes('dark'),
          media: consulta,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        }) as unknown as MediaQueryList,
    );
  }

  beforeEach(() => {
    localStorage.removeItem(CLAVE);
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('app-dark');
    TestBed.configureTestingModule({});
  });

  it('arranca en claro y lo deja marcado en el documento', () => {
    preferenciaDelSistema(false);
    const tema = TestBed.inject(TemaService);

    expect(tema.esOscuro()).toBeFalse();
    expect(document.documentElement.dataset['theme']).toBeUndefined();
    expect(document.documentElement.classList.contains('app-dark')).toBeFalse();
  });

  it('alterna a oscuro y escribe el atributo', () => {
    preferenciaDelSistema(false);
    const tema = TestBed.inject(TemaService);

    tema.alternar();

    expect(tema.esOscuro()).toBeTrue();
    expect(document.documentElement.dataset['theme']).toBe('oscuro');
    expect(document.documentElement.classList.contains('app-dark')).toBeTrue();
  });

  it('vuelve a claro y limpia el atributo', () => {
    preferenciaDelSistema(false);
    const tema = TestBed.inject(TemaService);

    tema.alternar();
    tema.alternar();

    expect(tema.esOscuro()).toBeFalse();
    expect(document.documentElement.dataset['theme']).toBeUndefined();
    expect(document.documentElement.classList.contains('app-dark')).toBeFalse();
  });

  it('recupera la preferencia guardada', () => {
    preferenciaDelSistema(false);
    localStorage.setItem(CLAVE, 'oscuro');

    const tema = TestBed.inject(TemaService);

    expect(tema.esOscuro()).toBeTrue();
  });

  it('la preferencia guardada gana sobre la del sistema', () => {
    preferenciaDelSistema(true);
    localStorage.setItem(CLAVE, 'claro');

    const tema = TestBed.inject(TemaService);

    expect(tema.esOscuro()).toBeFalse();
  });

  it('sin preferencia guardada sigue al sistema', () => {
    preferenciaDelSistema(true);

    const tema = TestBed.inject(TemaService);

    expect(tema.esOscuro()).toBeTrue();
  });

  it('persiste el tema elegido para la próxima visita', () => {
    preferenciaDelSistema(false);
    const tema = TestBed.inject(TemaService);

    tema.alternar();

    expect(localStorage.getItem(CLAVE)).toBe('oscuro');
  });
});
