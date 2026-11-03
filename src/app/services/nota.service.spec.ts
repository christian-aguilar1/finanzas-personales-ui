import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NotaService } from './nota.service';
import { environment } from '../../environments/environment';

describe('NotaService', () => {
  let service: NotaService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(NotaService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('consulta próximas notas sin enviar un id de usuario', () => {
    service.proximas().subscribe(notas => expect(notas).toEqual([]));
    const req = http.expectOne(`${environment.apiUrl}/notas/proximas`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('actualiza una nota propia mediante su id', () => {
    service.actualizar(3, { texto: 'Pagar luz', fechaLimite: '2026-11-05', resuelta: true }).subscribe();
    const req = http.expectOne(`${environment.apiUrl}/notas/3`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ texto: 'Pagar luz', fechaLimite: '2026-11-05', resuelta: true });
    req.flush({ id: 3, texto: 'Pagar luz', fechaLimite: '2026-11-05', resuelta: true, diasRestantes: 2 });
  });
});
