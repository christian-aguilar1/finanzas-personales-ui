import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TelegramService } from './telegram.service';
import { environment } from '../../environments/environment';

describe('TelegramService', () => {
  let service: TelegramService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(TelegramService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('solicita un enlace sin enviar identidad ni secretos del bot', () => {
    service.crearEnlace().subscribe();
    const req = http.expectOne(`${environment.apiUrl}/telegram/vincular`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ url: 'https://t.me/prueba_bot?start=codigo', expiraEn: '2099-01-01T12:00:00Z' });
  });

  it('consulta y guarda las preferencias bajo la sesión autenticada', () => {
    service.obtenerPreferencias().subscribe();
    http.expectOne(`${environment.apiUrl}/telegram/preferencias`).flush({ cuentaId: null, categoriaId: null });
    service.guardarPreferencias({ cuentaId: 2, categoriaId: 11 }).subscribe();
    const req = http.expectOne(`${environment.apiUrl}/telegram/preferencias`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ cuentaId: 2, categoriaId: 11 });
    req.flush({ cuentaId: 2, categoriaId: 11 });
  });

  it('consulta el estado y desvincula usando la sesión de la app', () => {
    service.obtenerEstado().subscribe();
    http.expectOne(`${environment.apiUrl}/telegram/estado`).flush({ disponible: false, vinculado: false });
    service.desvincular().subscribe();
    const req = http.expectOne(`${environment.apiUrl}/telegram/desvincular`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
