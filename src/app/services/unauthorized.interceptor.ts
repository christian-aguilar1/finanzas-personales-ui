import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { catchError, switchMap, take, throwError } from 'rxjs';

/**
 * Un 401 NO siempre significa "vuelve a iniciar sesión", así que la redirección
 * solo tiene sentido cuando además no hay sesión:
 *
 * - **Sin sesión** (error.status === 401 && !auth.isAuthenticated$): el guard
 *   puede no cubrir el caso —por ejemplo, la sesión venció con la pestaña abierta
 *   y la petición sale antes de que la navegación vuelva a pasar por el guard—,
 *   así que redirigir al login es lo correcto.
 *
 * - **Con sesión**: el token se envió y el backend lo rechazó, o sea que el
 *   problema es de configuración (audience incorrecto, API no habilitada en la
 *   Application SPA del tenant, token opaco), no de sesión. Redirigir devolvería
 *   al mismo 401: login -> request -> 401 -> loginWithRedirect() -> /callback ->
 *   request -> 401..., y el usuario quedaría rebotando entre Auth0 y la app sin
 *   ver nunca el error real. Aquí solo se propaga el error con
 *   `throwError(() => error)` para que el componente muestre su estado de error.
 */
export const unauthorizedInterceptorFn: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      return auth.isAuthenticated$.pipe(
        take(1),
        switchMap((haySesion) => {
          if (!haySesion) {
            auth.loginWithRedirect().subscribe({ error: () => undefined });
          }

          return throwError(() => error);
        }),
      );
    }),
  );
};
