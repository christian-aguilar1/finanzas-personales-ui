import { Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Nota, NotaRequest, fechaNota, plazoNota } from '../../models/nota.model';
import { CambiosNotasService } from '../../services/cambios-notas.service';
import { NotaService } from '../../services/nota.service';

@Component({
  selector: 'app-notas',
  imports: [FormsModule],
  templateUrl: './notas.html',
  styleUrl: './notas.css',
})
export class NotasComponent implements OnInit {
  private readonly servicio = inject(NotaService);
  private readonly cambios = inject(CambiosNotasService);
  readonly notas = signal<Nota[]>([]);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly aviso = signal('');
  readonly fechaNota = fechaNota;
  editandoId: number | null = null;
  texto = '';
  fechaLimite = '';

  constructor() { this.cambios.cambios$.pipe(takeUntilDestroyed()).subscribe(() => this.cargar()); }

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.servicio.listar().subscribe({
      next: notas => { this.notas.set(notas ?? []); this.cargando.set(false); },
      error: () => { this.error.set('No se pudieron cargar las notas.'); this.cargando.set(false); },
    });
  }

  guardar(): void {
    const texto = this.texto.trim();
    if (!texto || texto.length > 1000 || this.guardando()) return;
    const request: NotaRequest = { texto, fechaLimite: this.fechaLimite || null,
      resuelta: this.editandoId == null ? false : (this.notas().find(n => n.id === this.editandoId)?.resuelta ?? false) };
    this.guardando.set(true);
    this.error.set('');
    const operacion = this.editandoId == null ? this.servicio.crear(request) : this.servicio.actualizar(this.editandoId, request);
    operacion.subscribe({
      next: () => { this.guardando.set(false); this.aviso.set(this.editandoId == null ? 'Nota guardada.' : 'Nota actualizada.'); this.cancelar(); this.cargar(); },
      error: () => { this.guardando.set(false); this.error.set('No se pudo guardar la nota. Inténtalo de nuevo.'); },
    });
  }

  editar(nota: Nota): void {
    this.editandoId = nota.id;
    this.texto = nota.texto;
    this.fechaLimite = nota.fechaLimite ?? '';
    this.aviso.set('');
  }

  cancelar(): void { this.editandoId = null; this.texto = ''; this.fechaLimite = ''; }

  alternar(nota: Nota): void {
    this.servicio.actualizar(nota.id, { texto: nota.texto, fechaLimite: nota.fechaLimite, resuelta: !nota.resuelta }).subscribe({
      next: () => { this.aviso.set(nota.resuelta ? 'Nota reabierta.' : 'Nota resuelta.'); this.cargar(); },
      error: () => this.error.set('No se pudo cambiar el estado de la nota.'),
    });
  }

  eliminar(nota: Nota): void {
    if (!window.confirm('¿Eliminar esta nota?')) return;
    this.servicio.eliminar(nota.id).subscribe({
      next: () => { if (this.editandoId === nota.id) this.cancelar(); this.aviso.set('Nota eliminada.'); this.cargar(); },
      error: () => this.error.set('No se pudo eliminar la nota.'),
    });
  }

  plazo(nota: Nota): string {
    return plazoNota(nota.diasRestantes);
  }
}
