import {CommonModule} from '@angular/common';
import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {PaginaTransacciones, Transaccion} from '../../models/transaccion.model';
import {Cuenta} from '../../models/cuenta.model';
import {TransaccionService} from '../../services/transaccion.service';
import {CuentaService} from '../../services/cuenta.service';
import {Observable, forkJoin, of} from 'rxjs';
import {concatMap} from 'rxjs/operators';
import {Chart, registerables} from 'chart.js';

Chart.register(...registerables);

interface PeriodoOpcion {
  valor: string;
  etiqueta: string;
}

interface ResumenCategoria {
  categoriaId: number | null;
  categoriaNombre: string;
  total: number;
  cantidad: number;
}

const NOMBRE_COMPRAS_EN_CUOTAS = 'Compras en cuotas';
const NOMBRE_SALDO_INICIAL = 'Saldo inicial';
const TIPOS_CON_SALDO_INICIAL = ['DEBITO', 'EFECTIVO'];
const COLORS_EGRESOS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#6366f1',
  '#14b8a6',
  '#f43f5e',
  '#84cc16',
];


@Component({
  selector: 'app-presupuesto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './presupuesto.html',
  styleUrl: './presupuesto.css',
})
export class PresupuestoComponent implements OnInit {
  @ViewChild('graficoEgresos')
  graficoEgresosRef?: ElementRef<HTMLCanvasElement>;
  private chartEgresos?: Chart;

  periodoSeleccionado = this.obtenerPeriodoActual();
  periodosDisponibles: PeriodoOpcion[] = this.crearPeriodosDisponibles();

  cargando = false;
  error = '';
  transacciones: Transaccion[] = [];
  cuentas: Cuenta[] = [];

  ingresosPorCategoria: ResumenCategoria[] = [];
  egresosPorCategoria: ResumenCategoria[] = [];

  ingresoTotal = 0;
  egresoTotal = 0;

  constructor(
    private transaccionService: TransaccionService,
    private cuentaService: CuentaService
  ) {}

  ngOnInit(): void {
    this.cargarPresupuesto();
  }

  cargarPresupuesto(): void {
    this.cargando = true;
    this.error = '';

    const transacciones$ = this.cargarTodasLasTransaccionesPorPeriodo();
    const cuentas$ = this.cuentaService.obtenerCuentas();

    forkJoin({ transacciones: transacciones$, cuentas: cuentas$ })
      .subscribe({
        next: (resultado) => {
          this.transacciones = resultado.transacciones ?? [];
          this.cuentas = resultado.cuentas ?? [];
          this.procesarResumen();
          this.cargando = false;
          setTimeout(() => this.renderizarGraficoEgresos(), 0);
        },
        error: () => {
          this.error = 'No se pudieron cargar los datos del presupuesto.';
          this.cargando = false;
        },
      });
  }

  private cargarTodasLasTransaccionesPorPeriodo(page: number = 0, acumuladas: Transaccion[] = []): Observable<Transaccion[]> {
    return this.transaccionService
      .obtenerTransaccionesPorPeriodoFacturacion(this.periodoSeleccionado, page, 10)
      .pipe(
        concatMap((paginaTransacciones: PaginaTransacciones) => {
          const transaccionesActuales = [
            ...acumuladas,
            ...(paginaTransacciones._embedded?.transaccionResponseList ?? [])
          ];
          const totalPaginas = paginaTransacciones.page?.totalPages ?? 0;

          // `totalPages` en 0 viene de una lista vacía normalizada: no hay nada que paginar.
          if (totalPaginas <= 0 || page + 1 >= totalPaginas) {
            return of(transaccionesActuales);
          }

          return this.cargarTodasLasTransaccionesPorPeriodo(page + 1, transaccionesActuales);
        })
      );
  }

  onPeriodoChange(): void {
    this.cargarPresupuesto();
  }

  obtenerEtiquetaPeriodoActual(): string {
    const periodo = this.periodosDisponibles.find((item) => item.valor === this.periodoSeleccionado);
    return periodo?.etiqueta ?? this.periodoSeleccionado;
  }

  obtenerTotalFinal(): number {
    return this.ingresoTotal - this.egresoTotal;
  }

  private procesarResumen(): void {
    const transaccionesVisibles = this.transacciones.filter((item) => item.cuotaActual !== 0);
    const ingresos = transaccionesVisibles.filter((item) => item.tipo === 'INGRESO');
    const egresos = transaccionesVisibles.filter((item) => item.tipo === 'EGRESO');

    this.ingresosPorCategoria = this.agruparPorCategoria(ingresos);
    this.egresosPorCategoria = this.agruparPorCategoria(egresos);

    this.ingresoTotal = this.sumarMontos(ingresos);
    this.egresoTotal = this.sumarMontos(egresos);

    this.agregarSaldoInicialComoIngresos();
  }

  private agregarSaldoInicialComoIngresos(): void {
    const saldoInicial = this.cuentas
      .filter((cuenta) => TIPOS_CON_SALDO_INICIAL.includes(cuenta.tipo))
      .reduce((total, cuenta) => total + Number(cuenta.saldoInicial ?? 0), 0);

    if (saldoInicial !== 0) {
      this.ingresoTotal += saldoInicial;
      this.ingresosPorCategoria = [
        ...this.ingresosPorCategoria,
        { categoriaId: null, categoriaNombre: NOMBRE_SALDO_INICIAL, total: saldoInicial, cantidad: 1 },
      ].sort((a, b) => b.total - a.total);
    }
  }

  private agruparPorCategoria(transacciones: Transaccion[]): ResumenCategoria[] {
    const mapa = new Map<string, ResumenCategoria>();

    transacciones.forEach((transaccion) => {
      const esCompraEnCuotas = this.esCompraEnCuotas(transaccion);
      const categoriaId = esCompraEnCuotas
        ? null
        : transaccion.categoriaPadreId ?? transaccion.categoriaId ?? null;
      const categoriaNombre = esCompraEnCuotas
        ? NOMBRE_COMPRAS_EN_CUOTAS
        : (transaccion.categoriaPadreNombre ?? transaccion.categoriaNombre)?.trim() || 'Sin categoría';
      const clave = `${categoriaId ?? 'null'}-${categoriaNombre}`;
      const actual = mapa.get(clave) ?? {
        categoriaId,
        categoriaNombre,
        total: 0,
        cantidad: 0,
      };

      actual.total += Number(transaccion.monto ?? 0);
      actual.cantidad += 1;
      mapa.set(clave, actual);
    });

    return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
  }

  private esCompraEnCuotas(transaccion: Transaccion): boolean {
    return (transaccion.totalCuotas ?? 0) > 1;
  }

  private renderizarGraficoEgresos(): void {
    this.chartEgresos?.destroy();
    this.chartEgresos = undefined;

    if (!this.graficoEgresosRef?.nativeElement || this.egresosPorCategoria.length === 0) {
      return;
    }

    const formatearMoneda = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

    this.chartEgresos = new Chart(this.graficoEgresosRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: this.egresosPorCategoria.map((item) => item.categoriaNombre),
        datasets: [
          {
            data: this.egresosPorCategoria.map((item) => item.total),
            backgroundColor: COLORS_EGRESOS,
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 14, usePointStyle: true, boxWidth: 8 },
          },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.label}: ${formatearMoneda.format(context.parsed as number)}`,
            },
          },
        },
      },
    });
  }

  private sumarMontos(transacciones: Transaccion[]): number {
    return transacciones.reduce((acumulado, transaccion) => acumulado + Number(transaccion.monto ?? 0), 0);
  }

  ngOnDestroy(): void {
    this.chartEgresos?.destroy();
    this.chartEgresos = undefined;
  }

  private crearPeriodosDisponibles(): PeriodoOpcion[] {
    const opciones: PeriodoOpcion[] = [];
    const base = new Date();

    for (let i = 0; i < 12; i++) {
      const fecha = new Date(base.getFullYear(), base.getMonth() - i, 1);
      opciones.push({
        valor: this.formatearPeriodo(fecha),
        etiqueta: this.formatearEtiquetaPeriodo(fecha),
      });
    }

    return opciones;
  }

  private obtenerPeriodoActual(): string {
    return this.formatearPeriodo(new Date());
  }

  private formatearPeriodo(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    return `${anio}-${mes}`;
  }

  private formatearEtiquetaPeriodo(fecha: Date): string {
    const mes = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(fecha);
    const anio = fecha.getFullYear();
    return `${mes.charAt(0).toUpperCase() + mes.slice(1)} ${anio}`;
  }
}

