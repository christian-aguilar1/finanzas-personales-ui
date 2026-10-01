import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../environments/environment';
import { CuentaService } from './cuenta.service';

describe('CuentaService', () => {
  let service: CuentaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CuentaService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CuentaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('pide las cuentas sin userId en la URL', () => {
    service.obtenerCuentas().subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/cuentas`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, nombre: 'Cuenta Corriente', tipo: 'DEBITO' }]);
  });

  it('devuelve lista vacía cuando el backend responde 204 sin body', () => {
    let resultado: unknown[] | undefined;

    service.obtenerCuentas().subscribe((cuentas) => (resultado = cuentas));
    httpMock.expectOne(`${environment.apiUrl}/cuentas`).flush(null, { status: 204, statusText: 'No Content' });

    expect(resultado).toEqual([]);
  });

  it('mantiene PUT y DELETE contra /cuentas/{id}', () => {
    const request = { nombre: 'Cuenta', moneda: 'CLP', tipo: 'DEBITO', saldoInicial: 0 };

    service.actualizarCuenta(7, request).subscribe();
    const put = httpMock.expectOne(`${environment.apiUrl}/cuentas/7`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual(request);
    put.flush({ id: 7 });

    service.eliminarCuenta(7).subscribe();
    const del = httpMock.expectOne(`${environment.apiUrl}/cuentas/7`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null);
  });
});
