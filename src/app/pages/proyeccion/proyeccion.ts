import {CommonModule} from '@angular/common';
import {Component, ElementRef, OnInit, ViewChild, inject} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {CambiosFinancierosService} from '../../services/cambios-financieros.service';
import {FormsModule} from '@angular/forms';
import {Proyeccion, ProyeccionCategoria, ProyeccionTransaccion, TransaccionRequest} from '../../models/transaccion.model';
import {TransaccionService} from '../../services/transaccion.service';
import {TablaOrdenableDirective} from '../../shared/sortable-table.directive';
import {Chart, registerables} from 'chart.js';
import {forkJoin} from 'rxjs';

Chart.register(...registerables);

interface MesOpcion {
  valor: number;
  etiqueta: string;
}

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
  selector: 'app-proyeccion',
  standalone: true,
  imports: [CommonModule, FormsModule, TablaOrdenableDirective],
  templateUrl: './proyeccion.html',
  styleUrl: './proyeccion.css',
})
export class ProyeccionComponent implements OnInit {
  @ViewChild('graficoProyeccion')
  graficoProyeccionRef?: ElementRef<HTMLCanvasElement>;
  private chartProyeccion?: Chart;

  meses: MesOpcion[] = this.crearMeses();
  anios: number[] = this.crearAnios();
  mes = this.obtenerMesInicial();
  anio = this.obtenerAnioInicial(this.mes);

  cargando = false;
  error = '';
  proyeccion: Proyeccion | null = null;
  montoSimulado: number | null = null;
  cuotasSimuladas = 3;
  descripcionSimulada = '';
  simulacionActiva = false;
  cargandoSimulacion = false;
  errorSimulacion = '';
  mesesSimulados: Array<{ periodo: string; proyeccion: Proyeccion; cuota: number }> = [];
  guardandoProyeccion: ProyeccionTransaccion | null = null;
  avisoRegistro = '';
  fechaRegistro = this.fechaHoy();

  constructor(private transaccionService: TransaccionService) {
    inject(CambiosFinancierosService).cambios$.pipe(takeUntilDestroyed())
      .subscribe(() => this.cargarProyeccion());
  }

  ngOnInit(): void {
    this.cargarProyeccion();
  }

  cargarProyeccion(): void {
    if (!this.esPeriodoDisponible()) {
      this.proyeccion = null;
      this.error = '';
      this.chartProyeccion?.destroy();
      this.chartProyeccion = undefined;
      return;
    }

    this.cargando = true;
    this.error = '';

    this.transaccionService
      .obtenerProyeccion(this.obtenerPeriodo())
      .subscribe({
        next: (proyeccion) => {
          this.proyeccion = proyeccion;
          this.cargando = false;
          setTimeout(() => this.renderizarGrafico(), 0);
          if (this.simulacionActiva) this.calcularSimulacion();
        },
        error: () => {
          this.proyeccion = null;
          this.error = 'No se pudo calcular la proyección para el periodo seleccionado.';
          this.cargando = false;
        },
      });
  }

  simularCompra(): void {
    if (!this.montoSimulado || this.montoSimulado <= 0 || !Number.isInteger(this.cuotasSimuladas) || this.cuotasSimuladas < 1) return;
    this.simulacionActiva = true;
    this.errorSimulacion = '';
    this.calcularSimulacion();
  }

  limpiarSimulacion(): void {
    this.simulacionActiva = false;
    this.mesesSimulados = [];
    this.errorSimulacion = '';
  }

  obtenerCuotaSimulada(indice: number): number {
    const total = Math.round((Number(this.montoSimulado) || 0) * 100);
    const base = Math.floor(total / this.cuotasSimuladas);
    return (indice === this.cuotasSimuladas - 1 ? total - base * (this.cuotasSimuladas - 1) : base) / 100;
  }

  simulacionValida(): boolean {
    return Boolean(this.montoSimulado && this.montoSimulado > 0 && Number.isInteger(this.cuotasSimuladas) && this.cuotasSimuladas >= 1 && this.cuotasSimuladas <= 120);
  }

  obtenerBalanceBase(proyeccion: Proyeccion): number {
    return Number(proyeccion.saldoInicio ?? 0) + Number(proyeccion.ingresoTotal) - Number(proyeccion.egresoTotal);
  }

  obtenerEtiquetaMes(periodo: string): string {
    const [anio, mes] = periodo.split('-').map(Number);
    return new Intl.DateTimeFormat('es-CL', {month: 'long', year: 'numeric'}).format(new Date(anio, mes - 1, 1));
  }

  registrarProyectada(item: ProyeccionTransaccion): void {
    if (!item.cuentaId || !item.medio) {
      this.avisoRegistro = 'Esta transacción no tiene los datos necesarios para registrarla.';
      return;
    }
    this.guardandoProyeccion = item;
    this.avisoRegistro = '';
    const fecha = this.fechaHoy();
    const request: TransaccionRequest = {
      cuentaId: item.cuentaId,
      tipo: item.tipo,
      fecha,
      periodoFacturacion: this.periodoActual(),
      monto: item.monto,
      categoriaId: item.categoriaId ?? null,
      subcategoriaId: item.subcategoriaId ?? null,
      medio: item.medio,
      comercioId: item.comercioId ?? null,
      descripcion: item.descripcion ?? '',
      esRecurrente: item.esRecurrente ?? false,
      nombreRecurrente: item.nombreRecurrente ?? null,
      frecuenciaRecurrencia: item.frecuenciaRecurrencia ?? null,
      totalCuotas: item.totalCuotas ?? null,
      cuotaActual: item.totalCuotas ? item.cuotaActual ?? 1 : null,
      tagIds: [],
    };
    this.transaccionService.agregarTransaccion(request).subscribe({
      next: () => {
        this.guardandoProyeccion = null;
        this.avisoRegistro = 'Transacción registrada con la fecha y el período actuales.';
        this.cargarProyeccion();
      },
      error: () => {
        this.guardandoProyeccion = null;
        this.avisoRegistro = 'No se pudo registrar la transacción. Inténtalo de nuevo.';
      },
    });
  }

  private calcularSimulacion(): void {
    const periodos = this.crearPeriodosEscenario(this.obtenerPeriodo(), 12);
    this.cargandoSimulacion = true;
    const cuotas = Array.from({length: this.cuotasSimuladas}, (_, i) => this.obtenerCuotaSimulada(i));
    forkJoin(periodos.map((periodo) => this.transaccionService.obtenerProyeccion(periodo))).subscribe({
      next: proyecciones => {
        this.mesesSimulados = proyecciones.map((p, i) => ({
          periodo: periodos[i], proyeccion: p,
          cuota: i < cuotas.length ? cuotas[i] : 0,
        }));
        this.cargandoSimulacion = false;
      },
      error: () => {
        this.mesesSimulados = [];
        this.cargandoSimulacion = false;
        this.errorSimulacion = 'No se pudo calcular el escenario para los próximos 12 meses.';
      },
    });
  }

  private crearPeriodosEscenario(inicio: string, cantidad: number): string[] {
    const [anio, mes] = inicio.split('-').map(Number);
    return Array.from({length: cantidad}, (_, i) => {
      const fecha = new Date(anio, mes - 1 + i, 1);
      return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    });
  }

  private fechaHoy(): string {
    const fecha = new Date();
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
  }

  private periodoActual(): string { return this.fechaHoy().slice(0, 7); }

  esPeriodoDisponible(): boolean {
    return this.obtenerPeriodo() >= this.obtenerPeriodoActual();
  }

  esPeriodoEnCurso(): boolean {
    return this.obtenerPeriodo() === this.obtenerPeriodoActual();
  }

  obtenerEtiquetaPeriodo(): string {
    const mes = this.meses.find((item) => item.valor === Number(this.mes));
    return `${mes?.etiqueta ?? this.mes} ${this.anio}`;
  }

  obtenerTotal(): number {
    if (!this.proyeccion) {
      return 0;
    }
    return Number(this.proyeccion.ingresoTotal) - Number(this.proyeccion.egresoTotal);
  }

  obtenerIngresos(): ProyeccionCategoria[] {
    return this.proyeccion?.ingresosPorCategoria ?? [];
  }

  obtenerEgresos(): ProyeccionCategoria[] {
    return this.proyeccion?.egresosPorCategoria ?? [];
  }

  obtenerTransacciones(): ProyeccionTransaccion[] {
    const existentes = this.proyeccion?.transacciones ?? [];
    if (!this.simulacionActiva || !this.montoSimulado || !this.proyeccion) return existentes;
    const indice = this.diferenciaMeses(this.obtenerPeriodo(), this.mesesSimulados[0]?.periodo ?? this.obtenerPeriodo());
    if (indice < 0 || indice >= this.cuotasSimuladas) return existentes;
    return [...existentes, {
      descripcion: this.descripcionSimulada.trim() || 'Compra simulada', cuenta: 'Simulación',
      categoria: 'Compra simulada', cuota: `${indice + 1}/${this.cuotasSimuladas}`,
      fecha: `${this.obtenerPeriodo()}-01`, monto: this.obtenerCuotaSimulada(indice), tipo: 'EGRESO', esRealizada: false,
    }];
  }

  private diferenciaMeses(fin: string, inicio: string): number {
    const [anioFin, mesFin] = fin.split('-').map(Number);
    const [anioIni, mesIni] = inicio.split('-').map(Number);
    return (anioFin - anioIni) * 12 + mesFin - mesIni;
  }

  formatearFecha(fecha: string): string {
    if (!fecha) {
      return '-';
    }
    const partes = fecha.split('-');
    if (partes.length !== 3) {
      return fecha;
    }
    return `${partes[2]}-${partes[1]}-${partes[0]}`;
  }

  formatearCuota(cuota: string | null | undefined): string {
    return cuota ?? '-';
  }

  ngOnDestroy(): void {
    this.chartProyeccion?.destroy();
    this.chartProyeccion = undefined;
  }

  private obtenerPeriodo(): string {
    const mes = String(Number(this.mes)).padStart(2, '0');
    return `${this.anio}-${mes}`;
  }

  private obtenerPeriodoActual(): string {
    const ahora = new Date();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    return `${ahora.getFullYear()}-${mes}`;
  }

  private renderizarGrafico(): void {
    this.chartProyeccion?.destroy();
    this.chartProyeccion = undefined;

    const egresos = this.obtenerEgresos();
    if (!this.graficoProyeccionRef?.nativeElement || egresos.length === 0) {
      return;
    }

    const formatearMoneda = new Intl.NumberFormat('es-CL', {style: 'currency', currency: 'CLP', maximumFractionDigits: 0});

    this.chartProyeccion = new Chart(this.graficoProyeccionRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: egresos.map((item) => item.categoriaNombre),
        datasets: [
          {
            data: egresos.map((item) => item.total),
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
            labels: {padding: 14, usePointStyle: true, boxWidth: 8},
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

  private crearMeses(): MesOpcion[] {
    const formatear = new Intl.DateTimeFormat('es-ES', {month: 'long'});
    return Array.from({length: 12}, (_, indice) => {
      const etiqueta = formatear.format(new Date(2000, indice, 1));
      return {
        valor: indice + 1,
        etiqueta: etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1),
      };
    });
  }

  private crearAnios(): number[] {
    const anioActual = new Date().getFullYear();
    return Array.from({length: 11}, (_, indice) => anioActual + indice);
  }

  private obtenerMesInicial(): number {
    const proximoMes = new Date();
    proximoMes.setMonth(proximoMes.getMonth() + 1);
    return proximoMes.getMonth() + 1;
  }

  private obtenerAnioInicial(mes: number): number {
    const anioActual = new Date().getFullYear();
    return mes === 1 ? anioActual + 1 : anioActual;
  }
}
