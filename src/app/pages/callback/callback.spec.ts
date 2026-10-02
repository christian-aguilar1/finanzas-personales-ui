import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '@auth0/auth0-angular';

import { CallbackComponent } from './callback';

describe('CallbackComponent', () => {
  let component: CallbackComponent;
  let fixture: ComponentFixture<CallbackComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CallbackComponent],
      providers: [
        {
          provide: AuthService,
          useValue: { isLoading$: of(true) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CallbackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('informa que está procesando el retorno del login', () => {
    expect(fixture.nativeElement.textContent).toContain('Completando tu inicio de sesión');
  });

  it('no dice que cerró sesión: este retorno es un login, no un logout', () => {
    expect(fixture.nativeElement.textContent).not.toContain('Sesión cerrada');
  });
});
