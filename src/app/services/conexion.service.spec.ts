import { TestBed } from '@angular/core/testing';

import { ConexionService } from './conexion.service';

describe('ConexionService', () => {
  let servicio: ConexionService;
  let onLineOriginal: boolean;

  const setOnLine = (valor: boolean) => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => valor,
    });
  };

  beforeEach(() => {
    onLineOriginal = window.navigator.onLine;
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    setOnLine(onLineOriginal);
  });

  it('arranca conectado si el navegador dice que hay red', () => {
    setOnLine(true);

    servicio = TestBed.inject(ConexionService);

    expect(servicio.hayConexion()).toBeTrue();
    expect(servicio.sinConexion()).toBeFalse();
  });

  it('arranca sin conexión si navigator.onLine ya venía en false', () => {
    setOnLine(false);

    servicio = TestBed.inject(ConexionService);

    expect(servicio.sinConexion()).toBeTrue();
  });

  it('el banner se oculta al volver la conexión (evento online)', () => {
    setOnLine(false);
    servicio = TestBed.inject(ConexionService);
    expect(servicio.sinConexion()).toBeTrue();

    setOnLine(true);
    window.dispatchEvent(new Event('online'));

    expect(servicio.sinConexion()).toBeFalse();
    expect(servicio.hayConexion()).toBeTrue();
  });

  it('el banner aparece al perderse la conexión (evento offline)', () => {
    setOnLine(true);
    servicio = TestBed.inject(ConexionService);
    expect(servicio.sinConexion()).toBeFalse();

    setOnLine(false);
    window.dispatchEvent(new Event('offline'));

    expect(servicio.sinConexion()).toBeTrue();
  });

  describe('esErrorDeRed', () => {
    beforeEach(() => {
      servicio = TestBed.inject(ConexionService);
    });

    it('trata status 0 como error de red: la petición no llegó al servidor', () => {
      expect(servicio.esErrorDeRed(0)).toBeTrue();
    });

    it('no confunde un 4xx o 5xx con un fallo de red', () => {
      expect(servicio.esErrorDeRed(401)).toBeFalse();
      expect(servicio.esErrorDeRed(500)).toBeFalse();
    });

    it('no da por hecho un fallo de red si no hay status', () => {
      expect(servicio.esErrorDeRed(undefined)).toBeFalse();
    });
  });
});
