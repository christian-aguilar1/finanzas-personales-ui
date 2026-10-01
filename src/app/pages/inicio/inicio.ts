import {Component} from '@angular/core';
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
    this.router.navigate(['/transaccion']);
  }

  verTransacciones() {
    this.router.navigate(['/transacciones']);
  }
}
