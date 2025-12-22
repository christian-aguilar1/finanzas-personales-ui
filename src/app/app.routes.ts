import { Routes } from '@angular/router';
import {Inicio} from './pages/inicio/inicio';
import {TransaccionComponent} from './pages/transaccion/transaccion';

export const routes: Routes = [
  { path: '', redirectTo: '/inicio', pathMatch: 'full' },
  { path: 'inicio', component: Inicio },
  { path: 'transaccion', component: TransaccionComponent },
];
