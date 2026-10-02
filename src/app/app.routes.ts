import { Routes } from '@angular/router';
import { authGuardFn } from '@auth0/auth0-angular';
import { CallbackComponent } from './pages/callback/callback';
import { Inicio } from './pages/inicio/inicio';
import { TransaccionComponent } from './pages/transaccion/transaccion';
import { TransaccionesComponent } from './pages/transacciones/transacciones';
import { CategoriasComponent } from './pages/categorias/categorias';
import { CuentasComponent } from './pages/cuentas/cuentas';
import { PresupuestoComponent } from './pages/presupuesto/presupuesto';
import { ProyeccionComponent } from './pages/proyeccion/proyeccion';
import { CuadreComponent } from './pages/cuadre/cuadre';

export const routes: Routes = [
  { path: '', redirectTo: '/inicio', pathMatch: 'full' },
  // Retorno del login de Auth0 (authorizationParams.redirect_uri). Sin sesión aún,
  // por eso va fuera del guard.
  { path: 'callback', component: CallbackComponent },
  { path: 'inicio', component: Inicio, canActivate: [authGuardFn] },
  { path: 'transaccion', component: TransaccionComponent, canActivate: [authGuardFn] },
  { path: 'transaccion/:id', component: TransaccionComponent, canActivate: [authGuardFn] },
  { path: 'transacciones', component: TransaccionesComponent, canActivate: [authGuardFn] },
  { path: 'presupuesto', component: PresupuestoComponent, canActivate: [authGuardFn] },
  { path: 'proyeccion', component: ProyeccionComponent, canActivate: [authGuardFn] },
  { path: 'cuadre', component: CuadreComponent, canActivate: [authGuardFn] },
  { path: 'categorias', component: CategoriasComponent, canActivate: [authGuardFn] },
  { path: 'cuentas', component: CuentasComponent, canActivate: [authGuardFn] },
  { path: '**', redirectTo: '/inicio' },
];
