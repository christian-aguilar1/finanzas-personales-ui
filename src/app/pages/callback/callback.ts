import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '@auth0/auth0-angular';

@Component({
  selector: 'app-callback',
  imports: [],
  templateUrl: './callback.html',
  styleUrl: './callback.css',
})
export class CallbackComponent {
  // Inyectar AuthService dispara su constructor, que es quien ejecuta
  // handleRedirectCallback() al detectar `code` + `state` en la URL, y luego
  // navega a la ruta destino (`''` -> `/inicio`).
  private readonly auth = inject(AuthService);

  readonly procesando = toSignal(this.auth.isLoading$, { initialValue: true });
}
