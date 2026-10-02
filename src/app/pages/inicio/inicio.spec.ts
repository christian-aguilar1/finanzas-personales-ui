import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { Inicio } from './inicio';

describe('Inicio', () => {
  let component: Inicio;
  let fixture: ComponentFixture<Inicio>;
  let routerMock: { navigate: jasmine.Spy };

  beforeEach(async () => {
    routerMock = { navigate: jasmine.createSpy('navigate') };

    await TestBed.configureTestingModule({
      imports: [Inicio],
      providers: [
        { provide: Router, useValue: routerMock },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Inicio);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('debe navegar a ingresar transaccion', () => {
    component.agregarTransaccion();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/transaccion']);
  });

  it('debe navegar a ver transacciones', () => {
    component.verTransacciones();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/transacciones']);
  });
});
