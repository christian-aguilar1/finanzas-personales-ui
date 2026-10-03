import { HttpErrorResponse, HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '@auth0/auth0-angular';
import { MessageService } from 'primeng/api';

import { unauthorizedInterceptorFn } from './unauthorized.interceptor';

describe('unauthorizedInterceptorFn', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let loginWithRedirect: jasmine.Spy;
  let messageService: MessageService;

  const configurar = (haySesion: boolean) => {
    loginWithRedirect = jasmine.createSpy('loginWithRedirect').and.returnValue(of(void 0));

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([unauthorizedInterceptorFn])),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: { isAuthenticated$: of(haySesion), loginWithRedirect },
        },
        // El interceptor avisa los errores de red con un toast, asi que necesita
        // MessageService. En la app real lo registra app.config.ts; este TestBed
        // no carga esa config, asi que hay que darle el provider aqui.
        MessageService,
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    messageService = TestBed.inject(MessageService);
  };

  /** Dispara un GET que responde 401 y devuelve el error que llegó al suscriptor. */
  const pedirYRecibir401 = (): HttpErrorResponse => {
    let error!: HttpErrorResponse;
    http.get('/api/cuentas').subscribe({ error: (e: HttpErrorResponse) => (error = e) });
    httpMock.expectOne('/api/cuentas').flush(null, { status: 401, statusText: 'Unauthorized' });
    return error;
  };

  it('redirige al login cuando el 401 llega sin sesión', () => {
    configurar(false);

    const error = pedirYRecibir401();

    expect(loginWithRedirect).toHaveBeenCalledTimes(1);
    expect(error.status).toBe(401);
  });

  it('NO redirige cuando hay sesión: el 401 es de audience, no de sesión', () => {
    configurar(true);

    const error = pedirYRecibir401();

    expect(loginWithRedirect).not.toHaveBeenCalled();
    expect(error.status).toBe(401);
  });

  it('no dispara el login ante otros errores', () => {
    configurar(false);

    http.get('/api/cuentas').subscribe({ error: () => undefined });
    httpMock.expectOne('/api/cuentas').flush(null, { status: 500, statusText: 'Server Error' });

    expect(loginWithRedirect).not.toHaveBeenCalled();
  });

  it('deja pasar las respuestas exitosas sin tocar el login', () => {
    configurar(false);

    let resultado: unknown;
    http.get('/api/cuentas').subscribe((value: unknown) => (resultado = value));
    httpMock.expectOne('/api/cuentas').flush([{ id: 1 }]);

    expect(resultado).toEqual([{ id: 1 }]);
    expect(loginWithRedirect).not.toHaveBeenCalled();
  });

  describe('error de red (status 0)', () => {
    /** Dispara un GET que falla como lo hace el navegador cuando no hay salida. */
    const pedirYRecibirErrorDeRed = (): HttpErrorResponse => {
      let error!: HttpErrorResponse;
      http.get('/api/cuentas').subscribe({ error: (e: HttpErrorResponse) => (error = e) });
      // status 0 es lo que Angular reporta cuando la peticion no llega al servidor:
      // navigator.status undefined, como en un fallo de conexion real.
      httpMock
        .expectOne('/api/cuentas')
        .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
      return error;
    };

    it('avisa con un toast y propaga el error al componente', () => {
      configurar(true);
      const spy = spyOn(messageService, 'add');

      const error = pedirYRecibirErrorDeRed();

      expect(error.status).toBe(0);
      expect(spy).toHaveBeenCalledTimes(1);
      const aviso = spy.calls.mostRecent().args[0];
      expect(aviso.severity).toBe('warn');
      expect(aviso.summary).toBe('Sin conexión');
    });

    it('NO intenta redirigir al login: no es un problema de sesión', () => {
      configurar(true);

      pedirYRecibirErrorDeRed();

      expect(loginWithRedirect).not.toHaveBeenCalled();
    });
  });
});
