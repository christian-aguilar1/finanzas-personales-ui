import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { NotasComponent } from './notas';
import { NotaService } from '../../services/nota.service';
import { Nota } from '../../models/nota.model';

describe('NotasComponent', () => {
  let component: NotasComponent;
  let servicio: jasmine.SpyObj<NotaService>;
  const nota: Nota = { id: 3, texto: 'Pagar luz', fechaLimite: '2026-11-05', resuelta: false, diasRestantes: 2 };

  beforeEach(async () => {
    servicio = jasmine.createSpyObj<NotaService>('NotaService', ['listar', 'crear', 'actualizar', 'eliminar']);
    servicio.listar.and.returnValue(of([nota]));
    servicio.crear.and.returnValue(of(nota));
    servicio.actualizar.and.returnValue(of(nota));
    servicio.eliminar.and.returnValue(of(void 0));
    await TestBed.configureTestingModule({ imports: [NotasComponent], providers: [{ provide: NotaService, useValue: servicio }] }).compileComponents();
    const fixture = TestBed.createComponent(NotasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('guarda una nota nueva sin fecha y permite editar un vencimiento', () => {
    component.texto = 'Comprar regalo';
    component.guardar();
    expect(servicio.crear).toHaveBeenCalledWith({ texto: 'Comprar regalo', fechaLimite: null, resuelta: false });
    component.editar(nota);
    component.fechaLimite = '2026-11-06';
    component.guardar();
    expect(servicio.actualizar).toHaveBeenCalledWith(3, { texto: 'Pagar luz', fechaLimite: '2026-11-06', resuelta: false });
  });

  it('marca como resuelta y permite reabrir', () => {
    component.alternar(nota);
    expect(servicio.actualizar).toHaveBeenCalledWith(3, { texto: 'Pagar luz', fechaLimite: '2026-11-05', resuelta: true });
    component.alternar({ ...nota, resuelta: true });
    expect(servicio.actualizar).toHaveBeenCalledWith(3, { texto: 'Pagar luz', fechaLimite: '2026-11-05', resuelta: false });
  });

  it('conserva el formulario si falla el guardado', () => {
    servicio.crear.and.returnValue(throwError(() => new Error('sin conexión')));
    component.texto = 'Pagar arriendo';
    component.guardar();
    expect(component.texto).toBe('Pagar arriendo');
    expect(component.error()).toContain('No se pudo guardar');
  });
});
