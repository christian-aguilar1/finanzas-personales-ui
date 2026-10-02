import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@auth0/auth0-angular';

import { routes } from './app.routes';

describe('app.routes', () => {
  const buscarRuta = (path: string) => routes.find((ruta) => ruta.path === path);

  it('mantiene la redirección de la raíz a /inicio', () => {
    expect(buscarRuta('')).toEqual(
      jasmine.objectContaining({ redirectTo: '/inicio', pathMatch: 'full' }),
    );
  });

  it('protege con authGuardFn todas las páginas de la app', () => {
    const protegidas = rutasConComponente();

    expect(protegidas.length).toBeGreaterThan(0);

    protegidas.forEach(({ path, canActivate }) => {
      expect(canActivate?.length)
        .withContext(`la ruta ${path} debería estar protegida`)
        .toBe(1);
    });
  });
  it('deja /callback sin guard porque ahí vuelve el login', () => {
    const callback = buscarRuta('callback');

    expect(callback).toBeDefined();
    expect(callback?.canActivate).toBeUndefined();
  });

  it('incluye una wildcard que cae en /inicio', () => {
    expect(buscarRuta('**')?.redirectTo).toBe('/inicio');
  });

  it('bloquea la ruta protegida y dispara el login cuando no hay sesión', async () => {
    const loginWithRedirect = jasmine.createSpy('loginWithRedirect').and.returnValue(of(void 0));

    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: AuthService, useValue: { isAuthenticated$: of(false), loginWithRedirect } },
      ],
    });

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/transacciones');

    expect(loginWithRedirect).toHaveBeenCalled();
    expect(router.url).not.toContain('transacciones');
  });

  it('deja navegar a las rutas protegidas cuando hay sesión', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        {
          provide: AuthService,
          useValue: { isAuthenticated$: of(true), loginWithRedirect: () => of(void 0) },
        },
      ],
    });

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/inicio');

    expect(router.url).toBe('/inicio');
  });

  function rutasConComponente() {
    return routes
      .filter((ruta) => Boolean(ruta.component) && ruta.path !== 'callback')
      .map((ruta) => ({ path: ruta.path, canActivate: ruta.canActivate }));
  }
});
