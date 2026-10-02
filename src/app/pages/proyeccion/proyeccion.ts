import {CommonModule} from '@angular/common';
import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Proyeccion, ProyeccionCategoria, ProyeccionTransaccion} from '../../models/transaccion.model';
import {TransaccionService} from '../../services/transaccion.service';
import {Chart, registerables} from 'chart.js';

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
  imports: [CommonModule, FormsModule],
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

  constructor(private transaccionService: TransaccionService) {}

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
        },
        error: () => {
          this.proyeccion = null;
          this.error = 'No se pudo calcular la proyección para el periodo seleccionado.';
          this.cargando = false;
        },
      });
  }

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
    return this.proyeccion?.transacciones ?? [];
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
