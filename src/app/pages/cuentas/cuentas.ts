import {CommonModule} from '@angular/common';
import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Cuenta, CuentaRequest} from '../../models/cuenta.model';
import {CuentaService} from '../../services/cuenta.service';

@Component({
  selector: 'app-cuentas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cuentas.html',
  styleUrl: './cuentas.css',
})
export class CuentasComponent implements OnInit {
  @ViewChild('campoNombre') campoNombre?: ElementRef<HTMLInputElement>;

  cuentas: Cuenta[] = [];
  cargando = false;
  guardando = false;
  editandoCuentaId: number | null = null;
  error = '';

  readonly tiposCuenta = ['EFECTIVO', 'DEBITO', 'CREDITO', 'AHORRO'];
  cuentaForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private cuentaService: CuentaService,
  ) {
    this.cuentaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      tipo: ['EFECTIVO', Validators.required],
    });
  }

  ngOnInit(): void {
    this.cargarCuentas();
  }

  cargarCuentas(): void {
    this.cargando = true;
    this.error = '';

    this.cuentaService.obtenerCuentas().subscribe({
      next: (cuentas) => {
        this.cuentas = cuentas;
        this.cargando = false;
      },
      error: () => {
        this.cuentas = [];
        this.error = 'No se pudieron cargar tus cuentas.';
        this.cargando = false;
      },
    });
  }

  guardarCuenta(): void {
    if (this.cuentaForm.invalid) {
      this.cuentaForm.markAllAsTouched();
      return;
    }

    this.guardando = true;

    const request: CuentaRequest = {
      nombre: this.cuentaForm.value.nombre ?? '',
      moneda: 'CLP',
      tipo: this.cuentaForm.value.tipo ?? 'EFECTIVO',
      saldoInicial: 0,
    };

    const onSuccess = () => {
      this.resetFormulario();
      this.cargarCuentas();
      this.guardando = false;
    };

    const onError = () => {
      this.guardando = false;
    };

    if (this.editandoCuentaId !== null) {
      this.cuentaService.actualizarCuenta(this.editandoCuentaId, request).subscribe({
        next: onSuccess,
        error: onError,
      });
      return;
    }

    this.cuentaService.crearCuenta(request).subscribe({
      next: onSuccess,
      error: onError,
    });
  }

  editarCuenta(cuenta: Cuenta): void {
    this.editandoCuentaId = cuenta.id;
    this.cuentaForm.patchValue({
      nombre: cuenta.nombre,
      tipo: cuenta.tipo,
    });
  }

  cancelarEdicion(): void {
    this.resetFormulario();
  }

  eliminarCuenta(cuenta: Cuenta): void {
    const confirmado = window.confirm(`¿Eliminar la cuenta ${cuenta.nombre}?`);
    if (!confirmado) {
      return;
    }

    this.cuentaService.eliminarCuenta(cuenta.id).subscribe({
      next: () => this.cargarCuentas(),
    });
  }

  get enEdicion(): boolean {
    return this.editandoCuentaId !== null;
  }

  get sinCuentas(): boolean {
    return !this.cargando && !this.error && this.cuentas.length === 0;
  }

  irAlFormulario(): void {
    this.campoNombre?.nativeElement.focus();
  }

  private resetFormulario(): void {
    this.editandoCuentaId = null;
    this.cuentaForm.reset({
      nombre: '',
      tipo: 'EFECTIVO',
    });
  }
}

