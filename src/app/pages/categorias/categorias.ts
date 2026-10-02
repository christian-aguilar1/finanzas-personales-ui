import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Categoria, CategoriaRequest} from '../../models/categoria.model';
import {CategoriaService} from '../../services/categoria.service';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './categorias.html',
  styleUrl: './categorias.css',
})
export class CategoriasComponent implements OnInit {
  categorias: Categoria[] = [];
  cargando = false;
  guardando = false;
  editandoCategoriaId: number | null = null;
  error = '';

  readonly tiposCategoria = ['INGRESO', 'EGRESO'];
  categoriaForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private categoriaService: CategoriaService,
  ) {
    this.categoriaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      tipo: ['EGRESO', Validators.required],
      parentId: [null],
    });
  }

  ngOnInit(): void {
    this.cargarCategorias();
  }

  cargarCategorias(): void {
    this.cargando = true;
    this.error = '';

    this.categoriaService.obtenerCategorias().subscribe({
      next: (categorias) => {
        this.categorias = categorias;
        this.cargando = false;
      },
      error: () => {
        this.categorias = [];
        this.error = 'No se pudieron cargar tus categorías.';
        this.cargando = false;
      },
    });
  }

  guardarCategoria(): void {
    if (this.categoriaForm.invalid) {
      this.categoriaForm.markAllAsTouched();
      return;
    }

    this.guardando = true;
    this.error = '';

    const request: CategoriaRequest = {
      nombre: this.categoriaForm.value.nombre ?? '',
      tipo: this.categoriaForm.value.tipo ?? 'EGRESO',
      parentId: this.categoriaForm.value.parentId ?? null,
      icono: null,
      color: null,
    };

    const onSuccess = () => {
      this.resetFormulario();
      this.cargarCategorias();
      this.guardando = false;
    };

    const onError = (error: any) => {
      this.error = error?.error?.message ?? 'No se pudo guardar la categoría.';
      this.guardando = false;
    };

    if (this.editandoCategoriaId !== null) {
      this.categoriaService.actualizarCategoria(this.editandoCategoriaId, request).subscribe({
        next: onSuccess,
        error: onError,
      });
      return;
    }

    this.categoriaService.crearCategoria(request).subscribe({
      next: onSuccess,
      error: onError,
    });
  }

  editarCategoria(categoria: Categoria): void {
    this.editandoCategoriaId = categoria.id;
    this.categoriaForm.patchValue({
      nombre: categoria.nombre,
      tipo: categoria.tipo,
      parentId: categoria.parentId ?? null,
    });
  }

  padreNombre(categoria: Categoria): string {
    if (categoria.parentId === null || categoria.parentId === undefined) {
      return '—';
    }
    return this.categorias.find((item) => item.id === categoria.parentId)?.nombre ?? '—';
  }

  cancelarEdicion(): void {
    this.resetFormulario();
  }

  eliminarCategoria(categoria: Categoria): void {
    const confirmado = window.confirm(
      `¿Eliminar la categoría ${categoria.nombre}? Solo se puede eliminar si no tiene subcategorías ni transacciones asociadas.`
    );
    if (!confirmado) {
      return;
    }

    this.error = '';
    this.categoriaService.eliminarCategoria(categoria.id).subscribe({
      next: () => this.cargarCategorias(),
      error: (error: any) => {
        this.error = error?.error?.message ?? 'No se pudo eliminar la categoría.';
      },
    });
  }

  get enEdicion(): boolean {
    return this.editandoCategoriaId !== null;
  }

  get categoriasPadreDisponibles(): Categoria[] {
    const tipo = this.categoriaForm.get('tipo')?.value;
    const excluidas = new Set<number>();

    if (this.editandoCategoriaId !== null) {
      excluidas.add(this.editandoCategoriaId);
      this.agregarDescendientes(this.editandoCategoriaId, excluidas);
    }

    return this.categorias
      .filter((categoria) => categoria.tipo === tipo && !excluidas.has(categoria.id))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  private agregarDescendientes(idPadre: number, acumuladas: Set<number>): void {
    this.categorias
      .filter((categoria) => categoria.parentId === idPadre)
      .forEach((hija) => {
        if (!acumuladas.has(hija.id)) {
          acumuladas.add(hija.id);
          this.agregarDescendientes(hija.id, acumuladas);
        }
      });
  }

  private resetFormulario(): void {
    this.editandoCategoriaId = null;
    this.categoriaForm.reset({
      nombre: '',
      tipo: 'EGRESO',
      parentId: null,
    });
  }
}

