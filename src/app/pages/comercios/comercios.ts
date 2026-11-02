import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Comercio } from '../../models/comercio.model';
import { ComercioService } from '../../services/comercio.service';
import { TablaOrdenableDirective } from '../../shared/sortable-table.directive';

@Component({
  selector: 'app-comercios',
  imports: [ReactiveFormsModule, TablaOrdenableDirective],
  templateUrl: './comercios.html',
  styleUrl: './comercios.css',
})
export class ComerciosComponent implements OnInit {
  private readonly servicio = inject(ComercioService);
  readonly formulario = inject(FormBuilder).nonNullable.group({
    nombre: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(120)]],
    rubro: ['', Validators.maxLength(80)],
  });
  comercios: Comercio[] = [];
  cargando = false;
  guardando = false;
  errorCarga = false;
  errorGuardado = '';
  mensaje = '';

  ngOnInit(): void { this.cargarComercios(); }

  cargarComercios(): void {
    this.cargando = true;
    this.errorCarga = false;
    this.servicio.obtenerComercios().subscribe({
      next: comercios => { this.comercios = comercios; this.cargando = false; },
      error: () => { this.errorCarga = true; this.cargando = false; },
    });
  }

  guardarComercio(): void {
    if (this.guardando) return;
    this.mensaje = '';
    this.errorGuardado = '';
    if (this.formulario.invalid) { this.formulario.markAllAsTouched(); return; }
    this.guardando = true;
    const { nombre, rubro } = this.formulario.getRawValue();
    this.servicio.crearComercio({ nombre: nombre.trim(), rubro: rubro.trim() || null }).subscribe({
      next: () => {
        this.guardando = false;
        this.formulario.reset();
        this.mensaje = 'Comercio agregado.';
        this.cargarComercios();
      },
      error: () => {
        this.guardando = false;
        this.errorGuardado = 'No se pudo agregar el comercio. Inténtalo de nuevo.';
      },
    });
  }
}
