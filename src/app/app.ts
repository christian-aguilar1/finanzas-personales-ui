import { Component, effect, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {Header} from './shared/header/header';
import {Footer} from './shared/footer/footer';
import {ToastModule} from 'primeng/toast';
import {MessageService} from 'primeng/api';
import { ConexionService } from './services/conexion.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Header, Footer, ToastModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('finanzas-personales-ui');

  private readonly conexion = inject(ConexionService);
  private readonly messageService = inject(MessageService);

  /** Alimenta el banner de `app.html`. */
  protected readonly sinConexion = this.conexion.sinConexion;

  constructor() {
    // El aviso de "se restablecio" es momentaneo, asi que va por toast y no por el
    // banner: el banner es para el estado actual (sin conexion), no para transitorios.
    // Solo se avisa cuando se pasa de caido a conectado, nunca al iniciar la app.
    let estabaSinConexion = this.conexion.sinConexion();

    effect(() => {
      const ahoraSinConexion = this.conexion.sinConexion();

      if (estabaSinConexion && !ahoraSinConexion) {
        this.messageService.add({
          severity: 'success',
          summary: 'Conexión restablecida',
          detail: 'Los datos vuelven a actualizarse.',
          life: 4000
        });
      }

      estabaSinConexion = ahoraSinConexion;
    });
  }
}
