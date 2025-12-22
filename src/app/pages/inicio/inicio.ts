import { Component } from '@angular/core';
import {Router} from '@angular/router';
import {ButtonModule} from 'primeng/button';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio {

  constructor(private router: Router) {}

  agregarTransaccion() {
    this.router.navigate(['/transaccion']);
  }
}
