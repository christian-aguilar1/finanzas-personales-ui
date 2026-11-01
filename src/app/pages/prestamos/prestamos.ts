import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { CategoriaService } from '../../services/categoria.service';
import { Prestamo, PrestamoService } from '../../services/prestamo.service';

@Component({
  selector: 'app-prestamos', standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './prestamos.html', styleUrl: './prestamos.css'
})
export class PrestamosComponent implements OnInit {
  prestamos: Prestamo[] = [];
  visible = true;
  cargando = true;
  error = '';

  constructor(private prestamosService: PrestamoService, private categoriasService: CategoriaService) {}

  ngOnInit(): void {
    this.categoriasService.obtenerCategorias().pipe(
      switchMap(categorias => this.prestamosService.obtenerPrestamos().pipe(
        map(prestamos => ({ categorias, prestamos }))
      ))
    ).subscribe({
      next: ({ categorias, prestamos }) => {
        this.visible = categorias.some(c => c.codigoSistema === 'PRESTAMO_EGRESO');
        this.prestamos = prestamos.sort((a, b) => (a.fechaDevolucion ?? '9999-12-31').localeCompare(b.fechaDevolucion ?? '9999-12-31'));
        this.cargando = false;
      },
      error: () => { this.error = 'No se pudieron cargar los préstamos.'; this.cargando = false; }
    });
  }

  get pendienteTotal(): number { return this.prestamos.reduce((total, p) => total + Number(p.pendiente), 0); }
  get pendientes(): Prestamo[] { return this.prestamos.filter(p => p.pendiente > 0); }
  get devueltos(): Prestamo[] { return this.prestamos.filter(p => p.pendiente <= 0); }
  vencido(prestamo: Prestamo): boolean {
    return prestamo.pendiente > 0 && !!prestamo.fechaDevolucion && prestamo.fechaDevolucion < new Date().toISOString().slice(0, 10);
  }
}
