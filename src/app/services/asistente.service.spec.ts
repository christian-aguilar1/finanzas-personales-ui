import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AsistenteService } from './asistente.service';
import { environment } from '../../environments/environment';

describe('AsistenteService', () => {
  let service: AsistenteService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AsistenteService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('envía un historial acotado y no incluye identidad ni credenciales de IA', () => {
    const historial = Array.from({ length: 20 }, (_, i) => ({ role: 'user' as const, content: `${i}` }));
    service.conversar('Resumen', historial).subscribe();
    const req = http.expectOne(`${environment.apiUrl}/asistente/chat`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ mensaje: 'Resumen', historial: historial.slice(-12) });
    expect(req.request.headers.has('Authorization')).toBeFalse(); // El interceptor Auth0 lo agrega en la app.
    req.flush({ respuesta: 'Resumen real', propuestas: [] });
  });

  it('confirma por id y deja los datos aprobados en el servidor', () => {
    service.confirmar('propuesta-1').subscribe();
    const req = http.expectOne(`${environment.apiUrl}/asistente/propuestas/propuesta-1/confirmar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ transaccionId: 22, yaConfirmada: false });
  });
});
