import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Transaccion } from '../../models/transaccion.model';
import { Cuenta } from '../../models/cuenta.model';
import { CuadreAgrupado, CuadreGastos } from '../../models/cuadre.model';
import { CuentaService } from '../../services/cuenta.service';
import { CuadreService } from '../../services/cuadre.service';

interface PeriodoOpcion {
  valor: string;
  etiqueta: string;
}

const TOLERANCIA_PESOS = 10;

type TransaccionConComercio = Transaccion & { comercioNombre?: string | null };

@Component({
  selector: 'app-cuadre',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cuadre.html',
  styleUrl: './cuadre.css',
})
export class CuadreComponent implements OnInit {
  periodoSeleccionado = this.obtenerPeriodoActual();
  periodosDisponibles: PeriodoOpcion[] = this.crearPeriodosDisponibles();

  cuentas: Cuenta[] = [];
  cuentaIdSeleccionada: number | null = null;

  incluyeCuotaCero = false;

  montoIngresado: number | null = null;

  cargando = false;
  error = '';
  cuadre: CuadreGastos | null = null;

  constructor(
    private cuentaService: CuentaService,
    private cuadreService: CuadreService,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';

    this.cuentaService
      .obtenerCuentas()
      .pipe(catchError(() => of([] as Cuenta[])))
      .subscribe({
        next: (cuentas) => {
          this.cuentas = cuentas ?? [];
          this.resolverCuentaSeleccionada();
          this.cargarCuadre();
        },
        error: () => {
          this.cuentas = [];
          this.cuadre = null;
          this.error = 'No se pudieron cargar las cuentas del usuario.';
          this.cargando = false;
        },
      });
  }

  onPeriodoChange(): void {
    this.limpiarMontoIngresado();
    this.cargar();
  }

  /** Un usuario nuevo entra sin cuentas: el selector vacío no explica por qué. */
  get sinCuentas(): boolean {
    return !this.cargando && this.cuentas.length === 0;
  }

  onCuentaChange(): void {
    this.limpiarMontoIngresado();
    this.cargar();
  }

  limpiarMontoIngresado(): void {
    this.montoIngresado = null;
  }

  hayMontoIngresado(): boolean {
    return this.montoIngresado !== null && Number.isFinite(this.montoIngresado);
  }

  obtenerTotalPeriodo(): number {
    return this.cuadre?.total ?? 0;
  }

  obtenerDiferencia(): number {
    if (!this.hayMontoIngresado()) {
      return 0;
    }
    return (this.montoIngresado as number) - this.obtenerTotalPeriodo();
  }

  losMontosCuadran(): boolean {
    return this.hayMontoIngresado() && Math.abs(this.obtenerDiferencia()) <= TOLERANCIA_PESOS;
  }

  obtenerMensajeCuadre(): string {
    if (!this.hayMontoIngresado()) {
      return '';
    }

    const diferencia = this.obtenerDiferencia();
    const absoluto = Math.abs(diferencia);

    if (absoluto <= TOLERANCIA_PESOS) {
      return `El monto coincide con el total del periodo (diferencia de ${this.formatearNumero(absoluto)} dentro de la tolerancia de ${this.formatearNumero(TOLERANCIA_PESOS)}).`;
    }

    if (diferencia > 0) {
      return `Te faltan ${this.formatearNumero(absoluto)} por registrar.`;
    }

    return `Tenés ${this.formatearNumero(absoluto)} de más en la app.`;
  }

  private formatearNumero(valor: number): string {
    return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(valor);
  }

  obtenerEtiquetaPeriodo(): string {
    const periodo = this.periodosDisponibles.find(
      (item) => item.valor === this.periodoSeleccionado,
    );
    return periodo?.etiqueta ?? this.periodoSeleccionado;
  }

  obtenerPorCategoria(): CuadreAgrupado[] {
    return this.cuadre?.porCategoria ?? [];
  }

  obtenerPorComercio(): CuadreAgrupado[] {
    return this.cuadre?.porComercio ?? [];
  }

  obtenerTransacciones(): Transaccion[] {
    return this.cuadre?.transacciones ?? [];
  }

  obtenerTextoCuotas(transaccion: Transaccion): string {
    const cuotaActual = transaccion.cuotaActual;
    const totalCuotas = transaccion.totalCuotas;

    if (cuotaActual == null && totalCuotas == null) {
      return '1/1';
    }

    return `${cuotaActual ?? 1}/${totalCuotas ?? 1}`;
  }

  obtenerComercio(transaccion: Transaccion): string {
    const comercio = (transaccion as TransaccionConComercio).comercioNombre;
    return comercio?.trim() || 'Sin comercio';
  }

  obtenerCategoria(transaccion: Transaccion): string {
    const categoria = transaccion.categoriaPadreNombre ?? transaccion.categoriaNombre;
    return categoria?.trim() || 'Sin categoría';
  }

  esCompraEnCuotas(transaccion: Transaccion): boolean {
    return (transaccion.totalCuotas ?? 0) > 1;
  }

  private resolverCuentaSeleccionada(): void {
    if (this.cuentaIdSeleccionada !== null) {
      const sigueExistiendo = this.cuentas.some(
        (cuenta) => cuenta.id === this.cuentaIdSeleccionada,
      );
      if (sigueExistiendo) {
        return;
      }
      this.cuentaIdSeleccionada = null;
    }

    if (this.cuentas.length === 1) {
      this.cuentaIdSeleccionada = this.cuentas[0].id;
    }
  }

  private cargarCuadre(): void {
    if (this.cuentaIdSeleccionada === null) {
      this.cuadre = null;
      this.cargando = false;
      return;
    }

    this.cuadreService
      .obtenerCuadre(
        this.cuentaIdSeleccionada,
        this.periodoSeleccionado,
        this.incluyeCuotaCero,
      )
      .subscribe({
        next: (cuadre) => {
          this.cuadre = cuadre;
          this.cargando = false;
        },
        error: () => {
          this.cuadre = null;
          this.error = 'No se pudo calcular el cuadre de la cuenta seleccionada.';
          this.cargando = false;
        },
      });
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
