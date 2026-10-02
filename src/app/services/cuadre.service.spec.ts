import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../environments/environment';
import { CuadreService } from './cuadre.service';

describe('CuadreService', () => {
  let service: CuadreService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CuadreService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CuadreService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('pide el cuadre sin userId en la URL y con el periodo yyyy-MM', () => {
    service.obtenerCuadre(35, '2026-09', true).subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/transacciones/cuadre`);
    expect(req.request.url).not.toContain('porUsuario');
    expect(req.request.params.get('cuentaId')).toBe('35');
    expect(req.request.params.get('periodo')).toBe('2026-09');
    expect(req.request.params.get('incluyeCuotaCero')).toBe('true');
    req.flush(null);
  });
});
