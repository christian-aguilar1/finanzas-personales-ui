import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CategoriaService } from '../../services/categoria.service';

import { CategoriasComponent } from './categorias';

describe('CategoriasComponent', () => {
  let component: CategoriasComponent;
  let fixture: ComponentFixture<CategoriasComponent>;
  let actualizarCategoria: jasmine.Spy;
  let crearCategoria: jasmine.Spy;
  let eliminarCategoria: jasmine.Spy;

  const categorias = [
    { id: 1, nombre: 'Gastos Obligatorios', tipo: 'EGRESO', parentId: null },
    { id: 2, nombre: 'Arriendo', tipo: 'EGRESO', parentId: 1 },
    { id: 3, nombre: 'Salud', tipo: 'EGRESO', parentId: null },
    { id: 4, nombre: 'Sueldo', tipo: 'INGRESO', parentId: null },
  ];

  beforeEach(async () => {
    actualizarCategoria = jasmine.createSpy('actualizarCategoria').and.returnValue(of({}));
    crearCategoria = jasmine.createSpy('crearCategoria').and.returnValue(of({}));
    eliminarCategoria = jasmine.createSpy('eliminarCategoria').and.returnValue(of(void 0));

    await TestBed.configureTestingModule({
      imports: [CategoriasComponent],
      providers: [
        {
          provide: CategoriaService,
          useValue: {
            obtenerCategorias: () => of(categorias),
            crearCategoria,
            actualizarCategoria,
            eliminarCategoria,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoriasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ofrece como padres solo categorías del mismo tipo', () => {
    component.categoriaForm.patchValue({ tipo: 'EGRESO' });

    const nombres = component.categoriasPadreDisponibles.map((item) => item.nombre);
    expect(nombres).toEqual(['Arriendo', 'Gastos Obligatorios', 'Salud']);
    expect(nombres).not.toContain('Sueldo');
  });

  it('excluye la categoría en edición y sus subcategorías', () => {
    component.editarCategoria({ id: 1, nombre: 'Gastos Obligatorios', tipo: 'EGRESO', parentId: null });
    component.categoriaForm.patchValue({ tipo: 'EGRESO' });

    const nombres = component.categoriasPadreDisponibles.map((item) => item.nombre);
    expect(nombres).not.toContain('Gastos Obligatorios');
    expect(nombres).not.toContain('Arriendo');
    expect(nombres).toContain('Salud');
  });

  it('carga la categoría padre al editar', () => {
    component.editarCategoria(categorias[1]);

    expect(component.categoriaForm.get('parentId')?.value).toBe(1);
    expect(component.categoriaForm.get('nombre')?.value).toBe('Arriendo');
  });

  it('envía la categoría padre al actualizar', () => {
    component.editarCategoria(categorias[2]);
    component.categoriaForm.patchValue({ parentId: 2 });
    component.guardarCategoria();

    const request = actualizarCategoria.calls.mostRecent().args[1];
    expect(actualizarCategoria).toHaveBeenCalledWith(3, jasmine.objectContaining({ parentId: 2 }));
    expect(request.parentId).toBe(2);
  });

  it('envía parentId null cuando la categoría queda sin padre', () => {
    component.editarCategoria(categorias[1]);
    component.categoriaForm.patchValue({ parentId: null });
    component.guardarCategoria();

    expect(crearCategoria).not.toHaveBeenCalled();
    expect(actualizarCategoria.calls.mostRecent().args[1].parentId).toBeNull();
  });

  it('muestra el nombre del padre en la tabla', () => {
    expect(component.padreNombre(categorias[0])).toBe('—');
    expect(component.padreNombre(categorias[1])).toBe('Gastos Obligatorios');
  });

  describe('eliminación', () => {
    beforeEach(() => {
      spyOn(window, 'confirm').and.returnValue(true);
    });

    it('envía solo el id de la categoría', () => {
      component.eliminarCategoria(categorias[2]);

      expect(eliminarCategoria).toHaveBeenCalledWith(3);
    });

    it('no elimina si el usuario cancela la confirmación', () => {
      (window.confirm as jasmine.Spy).and.returnValue(false);

      component.eliminarCategoria(categorias[2]);

      expect(eliminarCategoria).not.toHaveBeenCalled();
    });

    it('muestra el mensaje del backend cuando rechaza el borrado', () => {
      eliminarCategoria.and.returnValue(throwError(() => ({ error: { message: 'No se puede eliminar porque tiene 2 subcategoría(s) asociada(s)' } })));

      component.eliminarCategoria(categorias[0]);

      expect(component.error).toContain('subcategoría');
    });
  });
});
