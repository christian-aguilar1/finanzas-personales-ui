import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../environments/environment';
import { TransaccionService } from './transaccion.service';

describe('TransaccionService', () => {
  let service: TransaccionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TransaccionService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(TransaccionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('pide las transacciones sin userId en la URL', () => {
    service.obtenerTransacciones(0, 10).subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/transacciones`);
    expect(req.request.method).toBe('GET');
    expect(req.request.url).not.toContain('porUsuario');
    req.flush({ _embedded: { transaccionResponseList: [] }, page: {} });
  });

  it('manda page, size y sort al backend', () => {
    service.obtenerTransacciones(2, 50, undefined, 'monto,asc').subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/transacciones`);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('50');
    expect(req.request.params.get('sort')).toBe('monto,asc');
    req.flush({ _embedded: { transaccionResponseList: [] }, page: {} });
  });

  it('traduce un 204 sin body en una página vacía en vez de reventar', () => {
    let transacciones: unknown[] | undefined;
    let totalPages: number | undefined;

    service.obtenerTransacciones().subscribe((resultado) => {
      transacciones = resultado.transacciones;
      totalPages = resultado.paginacion.totalPages;
    });

    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/transacciones`)
      .flush(null, { status: 204, statusText: 'No Content' });

    expect(transacciones).toEqual([]);
    expect(totalPages).toBe(0);
  });

  it('lee la lista y la paginación de una respuesta completa', () => {
    service.obtenerTransacciones(0, 10).subscribe((resultado) => {
      expect(resultado.transacciones.length).toBe(1);
      expect(resultado.paginacion.totalPages).toBe(3);
      expect(resultado.paginacion.currentPage).toBe(0);
    });

    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/transacciones`).flush({
      _embedded: { transaccionResponseList: [{ id: 1, fecha: '2026-09-05', monto: 100, tipo: 'EGRESO' }] },
      _links: { self: { href: 'http://localhost' } },
      page: { size: 10, totalElements: 25, totalPages: 3, number: 0 },
    });
  });

  it('mantiene el periodo como yyyy-MM en la proyección', () => {
    service.obtenerProyeccion('2026-10').subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/transacciones/proyeccion`);
    expect(req.request.params.get('periodo')).toBe('2026-10');
    req.flush({ periodo: '2026-10', ingresoTotal: 0, egresoTotal: 0, total: 0 });
  });

  it('elimina sin mandar userId', () => {
    service.eliminarTransaccion(7).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/transacciones/7/eliminar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.params.has('userId')).toBeFalse();
    req.flush(null);
  });
});
