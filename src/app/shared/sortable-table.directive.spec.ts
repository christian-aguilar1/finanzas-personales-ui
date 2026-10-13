import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';

import {TablaOrdenableDirective} from './sortable-table.directive';

@Component({
  standalone: true,
  imports: [TablaOrdenableDirective],
  template: `
    <table appTablaOrdenable>
      <thead>
        <tr>
          <th>Nombre</th>
          <th data-sort-type="numero">Monto</th>
          <th data-sortable="false">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Banco</td><td>100</td><td>editar</td></tr>
        <tr><td>Ahorro</td><td>5000</td><td>editar</td></tr>
        <tr><td>Caja</td><td>20</td><td>editar</td></tr>
      </tbody>
    </table>
  `,
})
class HostComponent {}

describe('TablaOrdenableDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  const cabeceras = (): HTMLTableCellElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('thead th')) as HTMLTableCellElement[];

  const primeraColumna = (): string[] =>
    (Array.from(fixture.nativeElement.querySelectorAll('tbody tr')) as HTMLTableRowElement[]).map(
      (fila) => fila.cells[0].textContent?.trim() ?? '',
    );

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [HostComponent]}).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('ordena de forma ascendente y luego descendente al hacer clic en la cabecera', () => {
    cabeceras()[0].click();
    expect(primeraColumna()).toEqual(['Ahorro', 'Banco', 'Caja']);

    cabeceras()[0].click();
    expect(primeraColumna()).toEqual(['Caja', 'Banco', 'Ahorro']);
  });

  it('marca visualmente la columna activa con orden-asc y orden-desc', () => {
    cabeceras()[0].click();
    expect(cabeceras()[0].classList).toContain('orden-asc');

    cabeceras()[0].click();
    expect(cabeceras()[0].classList).toContain('orden-desc');
    expect(cabeceras()[0].classList).not.toContain('orden-asc');
  });

  it('ordena numéricamente las columnas con data-sort-type="numero"', () => {
    cabeceras()[1].click();

    expect(primeraColumna()).toEqual(['Caja', 'Banco', 'Ahorro']);
  });

  it('no hace ordenables las columnas con data-sortable="false"', () => {
    cabeceras()[2].click();

    expect(cabeceras()[2].classList).not.toContain('ordenable');
    expect(primeraColumna()).toEqual(['Banco', 'Ahorro', 'Caja']);
  });
});
