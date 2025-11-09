import { Component } from '@angular/core';
import {Router} from '@angular/router';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio {

  constructor(private router: Router) {}

  agregarTransaccion() {
    // Navegar a la vista de agregar transacción (puedes crearla después)
    this.router.navigate(['/transaccion']);
  }
}
