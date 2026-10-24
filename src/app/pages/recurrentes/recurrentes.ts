import {CommonModule} from '@angular/common';
import {Component, OnInit, inject} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {TransaccionService} from '../../services/transaccion.service';
import {FRECUENCIAS_RECURRENCIA, Transaccion} from '../../models/transaccion.model';

type ColumnaOrden = 'nombre' | 'descripcion' | 'tipo' | 'frecuencia' | 'periodo' | 'cuenta' | 'categoria' | 'comercio' | 'monto';

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
  columnaOrden: ColumnaOrden = 'nombre';
  direccionOrden: 'asc' | 'desc' = 'asc';
  readonly columnas: {clave: ColumnaOrden; etiqueta: string}[] = [
    {clave: 'nombre', etiqueta: 'Recurrente'}, {clave: 'descripcion', etiqueta: 'Descripción'},
    {clave: 'tipo', etiqueta: 'Tipo'}, {clave: 'frecuencia', etiqueta: 'Frecuencia'},
    {clave: 'periodo', etiqueta: 'Mes de referencia'}, {clave: 'cuenta', etiqueta: 'Cuenta'},
    {clave: 'categoria', etiqueta: 'Categoría'}, {clave: 'comercio', etiqueta: 'Comercio'},
    {clave: 'monto', etiqueta: 'Último monto'},
  ];
  private readonly comparador = new Intl.Collator('es', {sensitivity: 'base', numeric: true});

  ordenarPor(columna: ColumnaOrden): void {
    this.direccionOrden = this.columnaOrden === columna && this.direccionOrden === 'asc' ? 'desc' : 'asc';
    this.columnaOrden = columna;
  }

  private valorOrden(t: Transaccion): string | number {
    switch (this.columnaOrden) {
      case 'nombre': return t.nombreRecurrente || 'Sin nombre';
      case 'descripcion': return t.descripcion ?? '';
      case 'tipo': return t.tipo;
      case 'frecuencia': return {MENSUAL: 1, TRIMESTRAL: 3, CUATRIMESTRAL: 4, SEMESTRAL: 6, ANUAL: 12}[t.frecuenciaRecurrencia ?? 'MENSUAL'];
      case 'periodo': return t.periodoFacturacion || t.fecha.slice(0, 7);
      case 'cuenta': return t.cuentaNombre ?? '';
      case 'categoria': return t.categoriaNombre ?? '';
      case 'comercio': return t.comercioNombre ?? '';
      case 'monto': return t.monto;
    }
  }

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
    const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]+/gu, '').toLowerCase();
    const termino = normalizar(this.busqueda.trim());
    return this.transacciones.filter(t => (!this.tipo || t.tipo === this.tipo)
      && (!this.frecuencia || (t.frecuenciaRecurrencia ?? 'MENSUAL') === this.frecuencia)
      && normalizar([t.nombreRecurrente, t.descripcion, t.cuentaNombre, t.categoriaNombre, t.comercioNombre].join(' ')).includes(termino)).sort((a, b) => {
        const va = this.valorOrden(a), vb = this.valorOrden(b);
        const comparacion = typeof va === 'number' && typeof vb === 'number'
          ? va - vb : this.comparador.compare(String(va), String(vb));
        return (this.direccionOrden === 'asc' ? comparacion : -comparacion) || a.id - b.id;
      });
  }
}
