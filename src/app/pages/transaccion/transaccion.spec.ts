import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Transaccion } from './transaccion';

describe('Transaccion', () => {
  let component: Transaccion;
  let fixture: ComponentFixture<Transaccion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Transaccion]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Transaccion);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
