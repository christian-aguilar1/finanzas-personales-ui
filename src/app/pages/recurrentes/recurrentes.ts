import {CommonModule} from '@angular/common';
import {Component, OnInit, inject} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {TransaccionService} from '../../services/transaccion.service';
import {FRECUENCIAS_RECURRENCIA, Transaccion} from '../../models/transaccion.model';

@Component({
  selector: 'app-recurrentes', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './recurrentes.html', styleUrl: './recurrentes.css',
})
export class RecurrentesComponent implements OnInit {
  private readonly servicio = inject(TransaccionService);
  readonly frecuencias = FRECUENCIAS_RECURRENCIA;
  transacciones: Transaccion[] = [];
  cargando = false;
  error = false;
  busqueda = '';
  tipo = '';
  frecuencia = '';

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando = true;
    this.error = false;
    this.servicio.obtenerRecurrentes().subscribe({
      next: datos => { this.transacciones = datos; this.cargando = false; },
      error: () => { this.error = true; this.cargando = false; },
    });
  }

  etiquetaFrecuencia(t: Transaccion): string {
    return this.frecuencias.find(f => f.valor === (t.frecuenciaRecurrencia ?? 'MENSUAL'))!.etiqueta;
  }

  get visibles(): Transaccion[] {
    const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const termino = normalizar(this.busqueda.trim());
    return this.transacciones.filter(t => (!this.tipo || t.tipo === this.tipo)
      && (!this.frecuencia || (t.frecuenciaRecurrencia ?? 'MENSUAL') === this.frecuencia)
      && normalizar([t.nombreRecurrente, t.descripcion, t.cuentaNombre, t.categoriaNombre].join(' ')).includes(termino));
  }
}
