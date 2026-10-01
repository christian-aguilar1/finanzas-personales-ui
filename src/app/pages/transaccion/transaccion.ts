import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import { CategoriaService } from '../../services/categoria.service';
import { Categoria } from '../../models/categoria.model';
import {Cuenta} from '../../models/cuenta.model';
import {CuentaService} from '../../services/cuenta.service';
import {NgClass} from '@angular/common';
import {TransaccionService} from '../../services/transaccion.service';
import {MessageService} from 'primeng/api';
import {Transaccion, TransaccionRequest} from '../../models/transaccion.model';

@Component({
  selector: 'app-transaccion',
  templateUrl: './transaccion.html',
  styleUrls: ['./transaccion.css'],
  standalone: true,
  imports: [ReactiveFormsModule, NgClass, RouterLink]
})
export class TransaccionComponent implements OnInit {
  transaccionForm: FormGroup;
  transaccionId: number | null = null;
  modoEdicion = false;

  categorias: Categoria[] = [];
  cuentas: Cuenta[] = [];
  comercios: any[] = [];
  cargandoCatalogos = true;
  private catalogosPendientes = 2;
  periodosFacturacion: Array<{ etiqueta: string; valor: string }> = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private categoriaService: CategoriaService,
    private cuentaService: CuentaService,
    private transaccionService: TransaccionService,
    private messageService: MessageService
    // private comercioService: ComercioService
  ) {
    this.transaccionForm = this.fb.group({
      tipo: ['EGRESO', Validators.required],
      fecha: [new Date().toISOString().split('T')[0], Validators.required],
      periodoFacturacion: [this.obtenerPeriodoFacturacionActual(), Validators.required],
      cuenta: ['', Validators.required],
      monto: [null, [Validators.required, Validators.min(1)]],
      categoria: ['', Validators.required],
      comercio: [''],
      esRecurrente: [false],
      esCompraCuotas: [false],
      cuotaActual: [null],
      totalCuotas: [null],
      descripcion: ['']
    }, {
      validators: [this.validarRelacionCuotas()]
    });
  }

  ngOnInit() {
    this.periodosFacturacion = this.crearOpcionesMesesFacturacion();
    this.actualizarValidacionesCuotas();

    const navigationState = history.state?.transaccion as Transaccion | undefined;
    const paramId = this.route.snapshot.paramMap.get('id');
    if (paramId) {
      this.transaccionId = Number(paramId);
      this.modoEdicion = true;
    }

    if (navigationState) {
      this.cargarTransaccionEnFormulario(navigationState);
    }

    this.transaccionForm.get('esCompraCuotas')?.valueChanges.subscribe(() => {
      this.actualizarValidacionesCuotas();
    });

    // Cargar categorías
    this.categoriaService.obtenerCategorias().subscribe({
      next: data => this.categorias = data,
      error: err => console.error('Error cargando categorías', err),
      complete: () => this.cerrarCargaCatalogos()
    });

    // Cargar cuentas
    this.cuentaService.obtenerCuentas().subscribe({
      next: (data: Cuenta[]) => this.cuentas = data,
      error: (err: any) => console.error('Error cargando cuentas', err),
      complete: () => this.cerrarCargaCatalogos()
    });
  }

  /** Un usuario nuevo llega sin cuentas ni categorías: no se puede registrar nada todavía. */
  get sinCuentas(): boolean {
    return this.cuentas.length === 0;
  }

  get sinCategorias(): boolean {
    return this.categorias.length === 0;
  }

  /** No bloquea mientras los catálogos siguen cargando, solo cuando ya sabemos que están vacíos. */
  get bloqueoConfiguracionInicial(): boolean {
    return !this.cargandoCatalogos && (this.sinCuentas || this.sinCategorias);
  }

  guardar() {
    if (this.bloqueoConfiguracionInicial) {
      return;
    }

    if (this.transaccionForm.invalid) {
      this.transaccionForm.markAllAsTouched();
      return;
    }

    const form = this.transaccionForm.value;

    const esCompraCuotas = Boolean(form.esCompraCuotas);

    const request: TransaccionRequest = {
      cuentaId: form.cuenta,
      tipo: form.tipo,
      fecha: form.fecha,
      periodoFacturacion: form.periodoFacturacion,
      monto: form.monto,
      categoriaId: Number(form.categoria) || null,
      subcategoriaId: null,
      comercioId: form.comercio || null,
      descripcion: form.descripcion || "",
      esRecurrente: form.esRecurrente,
      medio: esCompraCuotas ? 'CREDITO' : 'EFECTIVO',
      totalCuotas: esCompraCuotas ? Number(form.totalCuotas) : null,
      cuotaActual: esCompraCuotas ? Number(form.cuotaActual) : null,
      tagIds: []
    };

    const request$ = this.modoEdicion && this.transaccionId !== null
      ? this.transaccionService.actualizarTransaccion(this.transaccionId, request)
      : this.transaccionService.agregarTransaccion(request);

    request$.subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: this.modoEdicion ? 'Transacción actualizada con éxito' : 'Transacción registrada con éxito' });
        if (this.modoEdicion)
          this.router.navigate(['/transacciones']);
        // this.transaccionForm.reset({
        //   tipo: 'EGRESO',
        //   fecha: new Date().toISOString().split('T')[0],
        //   periodoFacturacion: this.obtenerPeriodoFacturacionActual(),
        //   cuenta: '',
        //   monto: null,
        //   categoria: '',
        //   comercio: '',
        //   esRecurrente: false,
        //   esCompraCuotas: false,
        //   cuotaActual: null,
        //   totalCuotas: null,
        //   descripcion: ''
        // });
        this.transaccionId = null;
        this.modoEdicion = false;
      },
      error: (err) => {
        console.error('Error al guardar la transacción:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la transacción. Intente nuevamente.' });
      }
    });
  }

  cancelar() {
    this.router.navigate(['/inicio']);
  }

  mostrarCamposCuotas(): boolean {
    return Boolean(this.transaccionForm.get('esCompraCuotas')?.value);
  }

  private cerrarCargaCatalogos(): void {
    this.catalogosPendientes -= 1;
    this.cargandoCatalogos = this.catalogosPendientes > 0;
  }

  private actualizarValidacionesCuotas(): void {
    const esCompraCuotas = Boolean(this.transaccionForm.get('esCompraCuotas')?.value);
    const cuotaActualControl = this.transaccionForm.get('cuotaActual');
    const totalCuotasControl = this.transaccionForm.get('totalCuotas');

    if (!cuotaActualControl || !totalCuotasControl) {
      return;
    }

    if (esCompraCuotas) {
      cuotaActualControl.setValidators([Validators.required, Validators.min(0)]);
      totalCuotasControl.setValidators([Validators.required, Validators.min(1)]);
    } else {
      cuotaActualControl.clearValidators();
      totalCuotasControl.clearValidators();
      cuotaActualControl.setValue(null);
      totalCuotasControl.setValue(null);
    }

    cuotaActualControl.updateValueAndValidity();
    totalCuotasControl.updateValueAndValidity();
    this.transaccionForm.updateValueAndValidity();
  }

  private validarRelacionCuotas(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const esCompraCuotas = Boolean(control.get('esCompraCuotas')?.value);
      const cuotaActual = Number(control.get('cuotaActual')?.value);
      const totalCuotas = Number(control.get('totalCuotas')?.value);

      if (!esCompraCuotas || Number.isNaN(cuotaActual) || Number.isNaN(totalCuotas)) {
        return null;
      }

      return cuotaActual > totalCuotas ? { cuotaMayorQueTotal: true } : null;
    };
  }

  private crearOpcionesMesesFacturacion(): Array<{ etiqueta: string; valor: string }> {
    const anioActual = new Date().getFullYear();

    return Array.from({ length: 12 }).map((_, indice) => {
      const fecha = new Date(anioActual, indice, 1);
      const etiqueta = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(fecha);
      const valor = `${anioActual}-${String(indice + 1).padStart(2, '0')}`;

      return {
        etiqueta: etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1),
        valor,
      };
    });
  }

  private obtenerPeriodoFacturacionActual(): string {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  }

  private cargarTransaccionEnFormulario(transaccion: Transaccion): void {
    const periodoFacturacion = transaccion.periodoFacturacion ?? this.obtenerPeriodoFacturacionActual();
    const esCompraCuotas = transaccion.totalCuotas != null || transaccion.cuotaActual != null;

    this.transaccionForm.patchValue({
      tipo: transaccion.tipo,
      fecha: transaccion.fecha,
      periodoFacturacion,
      cuenta: transaccion.cuentaId ?? '',
      monto: transaccion.monto,
      categoria: transaccion.categoriaId ?? '',
      comercio: '',
      esRecurrente: false,
      esCompraCuotas,
      cuotaActual: transaccion.cuotaActual ?? null,
      totalCuotas: transaccion.totalCuotas ?? null,
      descripcion: transaccion.descripcion ?? ''
    });

    if (esCompraCuotas) {
      this.actualizarValidacionesCuotas();
    }
  }
}
