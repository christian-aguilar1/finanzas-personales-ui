import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@auth0/auth0-angular';
import { MessageService } from 'primeng/api';
import { App } from './app';
import { ConexionService } from './services/conexion.service';

describe('App', () => {
  let fixture: ComponentFixture<App>;

  /** Crea el componente con el banner forzado en el estado pedido. */
  const crearCon = (sinConexion: boolean) => {
    // Signal real, no un objeto con set(): `App` lo lee como signal invocable
    // (`sinConexion()`), y el effect lo tiene que observar para reaccionar.
    const estado = signal(sinConexion);

    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated$: of(false),
            user$: of(null),
            loginWithRedirect: () => of(void 0),
            logout: () => of(void 0),
          },
        },
        MessageService,
        // Stub del servicio en vez de tocar `navigator.onLine`: los eventos
        // online/offline reales no existen en el navegador de pruebas.
        { provide: ConexionService, useValue: { sinConexion: estado.asReadonly() } },
      ],
    });

    fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    return fixture;
  };

  const banner = () =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.sin-conexion');

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('should create the app', () => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { isAuthenticated$: of(false), user$: of(null) },
        },
        MessageService,
      ],
    });

    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });

  it('muestra el banner de sin conexión con el texto acordado', () => {
    crearCon(true);

    const texto = banner()?.textContent ?? '';
    expect(texto).toContain('Sin conexión');
    expect(texto).toContain('Los datos pueden no estar actualizados.');
  });

  it('el banner es un anuncio accesible, no texto suelto', () => {
    crearCon(true);

    const el = banner();
    expect(el?.getAttribute('role')).toBe('status');
    expect(el?.getAttribute('aria-live')).toBe('polite');
  });

  it('oculta el banner cuando hay conexión', () => {
    crearCon(false);

    expect(banner()).toBeNull();
  });
});
