import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { timer } from 'rxjs';
import { EnlaceTelegram, EstadoTelegram } from '../../models/telegram.model';
import { TelegramService } from '../../services/telegram.service';
import { ConexionService } from '../../services/conexion.service';
import { PreferenciasTelegramComponent } from './preferencias-telegram';

@Component({
  selector: 'app-telegram', standalone: true,
  imports: [CommonModule, RouterLink, PreferenciasTelegramComponent],
  templateUrl: './telegram.html', styleUrl: './telegram.css',
})
export class TelegramComponent implements OnInit {
  private readonly service = inject(TelegramService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly conexion = inject(ConexionService);
  readonly estado = signal<EstadoTelegram | null>(null);
  readonly enlace = signal<EnlaceTelegram | null>(null);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly aviso = signal('');

  ngOnInit(): void {
    this.actualizar();
    // Solo consulta mientras se espera la vinculación; no persiste el enlace en el navegador.
    timer(4000, 4000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const enlace = this.enlace();
      if (!enlace) return;
      if (Date.parse(enlace.expiraEn) <= Date.now()) {
        this.enlace.set(null);
        this.aviso.set('El enlace venció. Genera uno nuevo para continuar.');
      } else if (!this.conexion.sinConexion() && !this.guardando() && !this.cargando()) {
        this.actualizar(true);
      }
    });
  }

  @HostListener('window:focus')
  alVolver(): void {
    if (this.enlace() && !this.guardando() && !this.cargando()) this.actualizar(true);
  }

  actualizar(silencioso = false): void {
    if (this.cargando() || this.guardando()) return;
    this.cargando.set(true);
    if (!silencioso) this.error.set('');
    this.service.obtenerEstado().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (estado) => {
        const estabaEsperando = this.enlace() !== null;
        this.estado.set(estado);
        this.cargando.set(false);
        this.error.set('');
        if (estado.vinculado) {
          this.enlace.set(null);
          if (estabaEsperando) this.aviso.set('Telegram conectado. Ya puedes conversar con el bot.');
        }
      },
      error: (error: unknown) => {
        this.cargando.set(false);
        this.error.set(this.mensajeError(error));
      },
    });
  }

  conectar(): void {
    if (this.guardando() || this.cargando() || !this.estado()?.disponible
      || this.estado()?.vinculado || this.conexion.sinConexion()) return;
    this.guardando.set(true);
    this.error.set('');
    this.aviso.set('');
    this.service.crearEnlace().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (enlace) => {
        this.enlace.set(enlace);
        this.guardando.set(false);
        this.aviso.set('Enlace listo. Abre Telegram y pulsa Iniciar para vincular tu cuenta.');
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        this.error.set(this.mensajeError(error));
      },
    });
  }

  desconectar(): void {
    if (this.guardando() || this.cargando() || this.conexion.sinConexion()) return;
    const estabaVinculado = this.estado()?.vinculado === true;
    this.guardando.set(true);
    this.error.set('');
    this.aviso.set('');
    this.service.desvincular().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.guardando.set(false);
        this.enlace.set(null);
        this.estado.update((estado) => estado && ({ ...estado, vinculado: false, telegramUsername: null, vinculadoEn: null }));
        this.aviso.set(estabaVinculado ? 'Telegram desconectado. El bot ya no tiene acceso a tu cuenta.'
          : 'Vinculación cancelada. El enlace ya no se puede utilizar.');
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        this.error.set(this.mensajeError(error));
      },
    });
  }

  private mensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.';
      if (error.status === 401 || error.status === 403) return 'No se pudo autorizar la solicitud. Revisa tu sesión.';
      if (typeof error.error?.message === 'string') return error.error.message;
    }
    return 'No pudimos completar la solicitud. Inténtalo nuevamente.';
  }
}
