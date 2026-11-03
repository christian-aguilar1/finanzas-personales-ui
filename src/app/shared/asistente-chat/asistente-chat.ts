import { CommonModule } from '@angular/common';
import {
  AfterViewChecked, Component, DestroyRef, ElementRef, ViewChild, inject, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { EstadoAsistente, MensajeAsistente, PropuestaAsistente } from '../../models/asistente.model';
import { AsistenteService } from '../../services/asistente.service';
import { CambiosFinancierosService } from '../../services/cambios-financieros.service';
import { CambiosNotasService } from '../../services/cambios-notas.service';
import { ConexionService } from '../../services/conexion.service';

interface TarjetaPropuesta extends PropuestaAsistente {
  estado: 'pendiente' | 'guardando' | 'guardada' | 'descartada' | 'vencida';
  error?: string;
}

interface EntradaChat extends MensajeAsistente {
  propuestas?: TarjetaPropuesta[];
}

@Component({
  selector: 'app-asistente-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DialogModule],
  templateUrl: './asistente-chat.html',
  styleUrl: './asistente-chat.css',
})
export class AsistenteChatComponent implements AfterViewChecked {
  private readonly asistente = inject(AsistenteService);
  private readonly cambios = inject(CambiosFinancierosService);
  private readonly cambiosNotas = inject(CambiosNotasService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly conexion = inject(ConexionService);
  @ViewChild('conversacion') private conversacion?: ElementRef<HTMLElement>;
  @ViewChild('campoMensaje') private campoMensaje?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('lanzador') private lanzador?: ElementRef<HTMLButtonElement>;

  visible = false;
  texto = '';
  readonly estado = signal<EstadoAsistente | null>(null);
  readonly cargandoEstado = signal(false);
  readonly enviando = signal(false);
  readonly confirmando = signal(false);
  readonly error = signal('');
  readonly mensajes = signal<EntradaChat[]>([]);
  private desplazar = false;
  private reintento: { texto: string; id: string } | null = null;
  readonly sugerencias = ['¿Cuánto llevo gastado este mes?', 'Explícame mi proyección', 'Quiero guardar una nota'];

  abrir(): void {
    this.visible = true;
    if (!this.estado()) this.cargarEstado();
  }

  cargarEstado(): void {
    if (this.cargandoEstado()) return;
    this.cargandoEstado.set(true);
    this.error.set('');
    this.asistente.obtenerEstado().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (estado) => {
        this.estado.set(estado);
        this.cargandoEstado.set(false);
      },
      error: (error: unknown) => {
        this.error.set(this.mensajeError(error));
        this.cargandoEstado.set(false);
      },
    });
  }

  enfocar(): void {
    this.campoMensaje?.nativeElement.focus();
    this.desplazar = true;
  }

  alCerrar(): void {
    this.lanzador?.nativeElement.focus();
  }

  nuevaConversacion(): void {
    if (this.enviando() || this.confirmando()) return;
    this.mensajes.set([]);
    this.texto = '';
    this.error.set('');
    this.reintento = null;
    this.enfocar();
  }

  usarSugerencia(texto: string): void {
    this.texto = texto;
    this.enviar();
  }

  enviarConTeclado(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      this.enviar();
    }
  }

  enviar(): void {
    const texto = this.texto.trim();
    if (!texto || texto.length > 2000 || this.enviando() || this.confirmando()
      || !this.estado()?.disponible || this.conexion.sinConexion()) return;
    // Solo memoria de esta sesión: no guardar conversaciones financieras en localStorage.
    const historial = this.mensajes().map(({ role, content }) => ({ role, content: content.slice(0, 4000) })).slice(-12);
    const solicitudId = this.reintento?.texto === texto ? this.reintento.id : crypto.randomUUID();
    this.mensajes.update((mensajes) => [...mensajes, { role: 'user', content: texto }]);
    this.texto = '';
    this.error.set('');
    this.enviando.set(true);
    this.desplazar = true;
    this.asistente.conversar(texto, historial, solicitudId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (respuesta) => {
        this.reintento = null;
        if (respuesta.notaGuardada) this.cambiosNotas.notificar();
        this.mensajes.update((mensajes) => [...mensajes, {
          role: 'assistant', content: respuesta.respuesta,
          propuestas: respuesta.propuestas.map((p) => ({ ...p, estado: 'pendiente' })),
        }]);
        this.enviando.set(false);
        this.desplazar = true;
        this.enfocar();
      },
      error: (error: unknown) => {
        this.reintento = { texto, id: solicitudId };
        this.mensajes.update((mensajes) => mensajes.slice(0, -1));
        this.texto = texto;
        this.error.set(this.mensajeError(error));
        this.enviando.set(false);
        this.enfocar();
      },
    });
  }

  confirmar(propuesta: TarjetaPropuesta): void {
    if (propuesta.estado !== 'pendiente' || this.confirmando() || this.enviando()
      || this.conexion.sinConexion()) return;
    if (Date.parse(propuesta.expiraEn) <= Date.now()) {
      propuesta.estado = 'vencida';
      this.actualizarTarjetas();
      return;
    }
    propuesta.estado = 'guardando';
    propuesta.error = '';
    this.confirmando.set(true);
    this.actualizarTarjetas();
    this.asistente.confirmar(propuesta.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        propuesta.estado = 'guardada';
        this.confirmando.set(false);
        this.actualizarTarjetas();
        this.cambios.notificar();
        this.mensajes.update((mensajes) => [...mensajes, {
          role: 'assistant',
          content: `Movimiento confirmado y guardado: ${propuesta.transaccion.descripcion || propuesta.categoriaNombre}, ${propuesta.transaccion.monto} CLP, cuenta ${propuesta.cuentaNombre}.`,
        }]);
        this.desplazar = true;
      },
      error: (error: unknown) => {
        propuesta.estado = error instanceof HttpErrorResponse && error.status === 410 ? 'vencida' : 'pendiente';
        propuesta.error = this.mensajeError(error);
        this.confirmando.set(false);
        this.actualizarTarjetas();
      },
    });
  }

  descartar(propuesta: TarjetaPropuesta): void {
    if (propuesta.estado !== 'pendiente' || this.confirmando()) return;
    propuesta.estado = 'descartada';
    this.actualizarTarjetas();
  }

  ngAfterViewChecked(): void {
    if (this.desplazar && this.conversacion) {
      const contenedor = this.conversacion.nativeElement;
      contenedor.scrollTop = contenedor.scrollHeight;
      this.desplazar = false;
    }
  }

  private actualizarTarjetas(): void {
    this.mensajes.update((mensajes) => [...mensajes]);
  }

  private mensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'No pudimos conectar. Revisa tu conexión e inténtalo nuevamente.';
      if (error.status === 401 || error.status === 403) return 'No se pudo autorizar la consulta. Revisa tu sesión.';
      if (typeof error.error?.message === 'string') return error.error.message;
    }
    return 'No pudimos completar la solicitud. Inténtalo nuevamente.';
  }
}
