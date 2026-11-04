import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {forkJoin, Observable, of} from 'rxjs';
import {concatMap} from 'rxjs/operators';
import {Categoria} from '../../models/categoria.model';
import {PresupuestoCategoria} from '../../models/presupuesto.model';
import {Transaccion} from '../../models/transaccion.model';
import {CategoriaService} from '../../services/categoria.service';
import {PresupuestoService} from '../../services/presupuesto.service';
import {TransaccionService} from '../../services/transaccion.service';

@Component({selector: 'app-presupuestos', standalone: true, imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './presupuestos.html', styleUrl: './presupuestos.css'})
export class PresupuestosComponent implements OnInit {
  categorias: Categoria[] = [];
  presupuestos: PresupuestoCategoria[] = [];
  gastos: Transaccion[] = [];
  periodo = this.periodoActual();
  montos: Record<number, number> = {};
  cargando = true;
  error = '';
  aviso = '';
  guardandoId: number | null = null;

  constructor(private readonly categoriaService: CategoriaService, private readonly presupuestoService: PresupuestoService,
    private readonly transaccionService: TransaccionService) {}

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando = true;
    forkJoin({categorias: this.categoriaService.obtenerCategorias(), presupuestos: this.presupuestoService.listar(),
      gastos: this.cargarGastos()})
      .subscribe({next: r => {
        this.categorias = r.categorias.filter(c => c.tipo === 'EGRESO' && !c.parentId);
        this.presupuestos = r.presupuestos;
        this.gastos = r.gastos.filter(t => t.tipo === 'EGRESO' && t.cuotaActual !== 0);
        for (const p of this.presupuestos) this.montos[p.categoriaId] = p.montoMensual;
        this.cargando = false;
      }, error: () => { this.error = 'No se pudieron cargar los presupuestos.'; this.cargando = false; }});
  }

  private cargarGastos(pagina = 0, anteriores: Transaccion[] = []): Observable<Transaccion[]> {
    return this.transaccionService.obtenerTransaccionesPorPeriodoFacturacion(this.periodo, pagina, 100).pipe(
      concatMap(respuesta => {
        const acumuladas = [...anteriores, ...(respuesta._embedded?.transaccionResponseList ?? [])];
        return pagina + 1 < (respuesta.page?.totalPages ?? 0)
          ? this.cargarGastos(pagina + 1, acumuladas) : of(acumuladas);
      }),
    );
  }

  private periodoActual(): string {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  }

  gasto(categoriaId: number): number {
    return this.gastos.filter(t => (t.categoriaPadreId ?? t.categoriaId) === categoriaId).reduce((sum, t) => sum + Number(t.monto), 0);
  }

  presupuesto(categoriaId: number): PresupuestoCategoria | undefined { return this.presupuestos.find(p => p.categoriaId === categoriaId); }

  guardar(categoria: Categoria): void {
    const monto = Number(this.montos[categoria.id]);
    if (!Number.isFinite(monto) || monto <= 0) { this.error = 'Indica un límite mensual mayor que cero.'; return; }
    this.guardandoId = categoria.id; this.error = '';
    this.presupuestoService.guardar(categoria.id, monto).subscribe({next: p => {
      this.presupuestos = [...this.presupuestos.filter(x => x.categoriaId !== p.categoriaId), p];
      this.guardandoId = null; this.aviso = `Límite actualizado para ${categoria.nombre}.`;
    }, error: () => { this.guardandoId = null; this.error = 'No se pudo guardar el límite.'; }});
  }

  quitar(categoriaId: number): void {
    this.presupuestoService.eliminar(categoriaId).subscribe({next: () => {
      this.presupuestos = this.presupuestos.filter(p => p.categoriaId !== categoriaId);
      delete this.montos[categoriaId];
    }, error: () => this.error = 'No se pudo quitar el límite.'});
  }

  porcentaje(categoriaId: number): number {
    const maximo = Number(this.montos[categoriaId] || 0);
    return maximo > 0 ? Math.min(100, this.gasto(categoriaId) / maximo * 100) : 0;
  }
}
