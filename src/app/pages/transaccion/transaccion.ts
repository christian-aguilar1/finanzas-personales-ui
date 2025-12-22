import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CategoriaService } from '../../services/categoria.service';
// import { CuentaService } from '../../services/cuenta';
// import { ComercioService } from '../../services/comercio';
import { Categoria } from '../../models/categoria.model';
import {Cuenta} from '../../models/cuenta.model';
import {CuentaService} from '../../services/cuenta.service';
import {NgClass} from '@angular/common';
import {TransaccionService} from '../../services/transaccion.service';
import {MessageService} from 'primeng/api';
// import { Cuenta } from '../models/cuenta.model';
// import { Comercio } from '../models/comercio.model';

@Component({
  selector: 'app-transaccion',
  templateUrl: './transaccion.html',
  styleUrls: ['./transaccion.css'],
  standalone: true,
  imports: [ReactiveFormsModule, NgClass]
})
export class TransaccionComponent implements OnInit {
  transaccionForm: FormGroup;

  categorias: Categoria[] = [];
  subcategorias: Categoria[] = [];
  cuentas: Cuenta[] = [];
  comercios: any[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private categoriaService: CategoriaService,
    private cuentaService: CuentaService,
    private transaccionService: TransaccionService,
    private messageService: MessageService
    // private comercioService: ComercioService
  ) {
    this.transaccionForm = this.fb.group({
      tipo: ['EGRESO', Validators.required],
      fecha: [new Date().toISOString().split('T')[0], Validators.required],
      cuenta: ['', Validators.required],
      monto: [null, [Validators.required, Validators.min(1)]],
      categoria: ['', Validators.required],
      subcategoria: [''],
      comercio: [''],
      esRecurrente: [false],
      descripcion: ['']
    });
  }

  ngOnInit() {
    const userId = 2; // usar el ID real del usuario

    // Cargar categorías
    this.categoriaService.obtenerCategoriasPorUsuario(userId).subscribe({
      next: data => this.categorias = data,
      error: err => console.error('Error cargando categorías', err)
    });

    // Cargar cuentas
    this.cuentaService.obtenerCuentasPorUsuario(userId).subscribe({
      next: (data: Cuenta[]) => this.cuentas = data,
      error: (err: any) => console.error('Error cargando cuentas', err)
    });

    // Cargar comercios
    // this.comercioService.obtenerComerciosPorUsuario(userId).subscribe({
    //   next: (data: Comercio[]) => this.comercios = data,
    //   error: (err: any) => console.error('Error cargando comercios', err)
    // });
  }

  onCategoriaChange() {
    const categoriaId = this.transaccionForm.get('categoria')?.value;
    this.subcategorias = this.categorias.filter(cat => cat.parent_id === categoriaId);
    if (this.subcategorias.length === 0) {
      this.transaccionForm.get('subcategoria')?.setValue('');
    }
  }

  guardar() {
    console.log("guardar, form: ", this.transaccionForm)
    if (this.transaccionForm.invalid) {
      this.transaccionForm.markAllAsTouched();
      return;
    }

    const form = this.transaccionForm.value;

    const request = {
      userId: 2,
      cuentaId: form.cuenta,
      tipo: form.tipo,
      fecha: form.fecha,
      monto: form.monto,
      categoriaId: form.categoria || null,
      subcategoriaId: form.subcategoria || null,
      medio: "EFECTIVO",
      comercioId: form.comercio || null,
      descripcion: form.descripcion || "",
      esRecurrente: form.esRecurrente,
      tagIds: []
    };

    this.transaccionService.agregarTransaccion(request).subscribe({
      next: (res) => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: "Transacción registrada con éxito"})
        console.log('✅ Transacción guardada:', res);
        this.router.navigate(['/inicio']);
      },
      error: (err) => {
        // this.alertService.show("Error al guardar la transacción: " + err)
        console.error('Error al guardar la transacción:', err);
      }
    });
  }

  cancelar() {
    this.router.navigate(['/inicio']);
  }
}
