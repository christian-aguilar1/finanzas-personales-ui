import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { Cuenta } from '../../models/cuenta.model';
import { Categoria } from '../../models/categoria.model';
import { TelegramService } from '../../services/telegram.service';
import { CuentaService } from '../../services/cuenta.service';
import { CategoriaService } from '../../services/categoria.service';
import { ConexionService } from '../../services/conexion.service';

@Component({
  selector: 'app-preferencias-telegram', standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './preferencias-telegram.html', styleUrl: './preferencias-telegram.css',
})
export class PreferenciasTelegramComponent {
  @ViewChild('campoCuenta') set campoCuenta(campo: ElementRef<HTMLSelectElement> | undefined) {
    campo?.nativeElement.focus();
  }
  private readonly telegram = inject(TelegramService);
  private readonly cuentaService = inject(CuentaService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly conexion = inject(ConexionService);
  readonly cuentas = signal<Cuenta[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly cargando = signal(false);
  readonly cargado = signal(false);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly aviso = signal('');
  readonly form = new FormGroup({
    cuentaId: new FormControl<number | null>(null),
    categoriaId: new FormControl<number | null>(null),
  });
  readonly categoriasGasto = computed(() => this.categorias().filter(c => {
    const padre = c.parentId ? this.categorias().find(p => p.id === c.parentId) : null;
    return c.tipo === 'EGRESO' && !c.codigoSistema && (!c.parentId || (padre?.tipo === 'EGRESO' && !padre.codigoSistema));
  }));

  constructor() { this.cargar(); }

  cargar(): void {
    if (this.cargando() || this.guardando()) return;
    this.cargando.set(true);
    this.error.set('');
    forkJoin({
      preferencias: this.telegram.obtenerPreferencias(),
      cuentas: this.cuentaService.obtenerCuentas(),
      categorias: this.categoriaService.obtenerCategorias(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ preferencias, cuentas, categorias }) => {
        this.cuentas.set(cuentas);
        this.categorias.set(categorias);
        this.form.setValue(preferencias);
        this.form.markAsPristine();
        this.cargado.set(true);
        this.cargando.set(false);
      },
      error: (error: unknown) => {
        this.cargando.set(false);
        this.error.set(this.mensajeError(error));
      },
    });
  }

  guardar(): void {
    if (!this.cargado() || this.cargando() || this.guardando() || this.conexion.sinConexion()) return;
    this.guardando.set(true);
    this.error.set('');
    this.aviso.set('');
    this.telegram.guardarPreferencias(this.form.getRawValue()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (preferencias) => {
        this.form.setValue(preferencias);
        this.form.markAsPristine();
        this.guardando.set(false);
        this.aviso.set('Preferencias guardadas. Se usarán cuando omitas esos datos en Telegram.');
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        this.error.set(this.mensajeError(error));
      },
    });
  }

  etiquetaCategoria(categoria: Categoria): string {
    const padre = this.categorias().find(c => c.id === categoria.parentId);
    return padre ? `${padre.nombre} › ${categoria.nombre}` : categoria.nombre;
  }

  get cuentaNoDisponible(): boolean {
    const id = this.form.controls.cuentaId.value;
    return id !== null && !this.cuentas().some(c => c.id === id);
  }

  get categoriaNoDisponible(): boolean {
    const id = this.form.controls.categoriaId.value;
    return id !== null && !this.categoriasGasto().some(c => c.id === id);
  }

  private mensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'No pudimos conectar con el servidor. Revisa tu conexión.';
      if (error.status === 401 || error.status === 403) return 'No se pudo autorizar la solicitud. Revisa tu sesión.';
      if (typeof error.error?.message === 'string') return error.error.message;
    }
    return 'No pudimos cargar o guardar las preferencias. Inténtalo nuevamente.';
  }
}
