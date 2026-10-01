import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CuentaService } from '../../services/cuenta.service';

import { CuentasComponent } from './cuentas';

describe('CuentasComponent', () => {
  let component: CuentasComponent;
  let fixture: ComponentFixture<CuentasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CuentasComponent],
      providers: [
        {
          provide: CuentaService,
          useValue: {
            obtenerCuentas: () => of([]),
            crearCuenta: () => of({}),
            actualizarCuenta: () => of({}),
            eliminarCuenta: () => of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CuentasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

