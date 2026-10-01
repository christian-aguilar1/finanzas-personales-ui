import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@auth0/auth0-angular';

import { Header } from './header';

describe('Header', () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;
  let loginWithRedirect: jasmine.Spy;
  let logout: jasmine.Spy;

  const configurarSesion = (autenticado: boolean, email: string | null) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [Header],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated$: of(autenticado),
            user$: of(email ? { email, sub: 'auth0|1' } : null),
            loginWithRedirect,
            logout,
          },
        },
      ],
    });

    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    loginWithRedirect = jasmine.createSpy('loginWithRedirect').and.returnValue(of(void 0));
    logout = jasmine.createSpy('logout').and.returnValue(of(void 0));
  });

  it('should create', () => {
    configurarSesion(false, null);

    expect(component).toBeTruthy();
  });

  it('ofrece iniciar sesión cuando no hay sesión', () => {
    configurarSesion(false, null);

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Iniciar sesión');
    expect(texto).not.toContain('Cerrar sesión');
  });

  it('ofrece cerrar sesión y muestra el email cuando hay sesión', () => {
    configurarSesion(true, 'persona@correo.com');

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Cerrar sesión');
    expect(texto).toContain('persona@correo.com');
  });

  it('el botón de login delega en Auth0 con redirección', () => {
    configurarSesion(false, null);

    component.login();

    expect(loginWithRedirect).toHaveBeenCalled();
  });

  it('el botón de logout vuelve al origen de la app', () => {
    configurarSesion(true, 'persona@correo.com');

    component.logout();

    expect(logout).toHaveBeenCalledWith({
      logoutParams: { returnTo: window.location.origin },
    });
  });

  it('no enlaza a /comercios porque esa ruta no existe', () => {
    configurarSesion(false, null);

    const enlaces = Array.from(
      fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>,
    ).map((enlace) => enlace.getAttribute('href'));

    expect(enlaces).not.toContain('/comercios');
  });
});
