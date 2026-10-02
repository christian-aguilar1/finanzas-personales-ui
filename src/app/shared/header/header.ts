import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '@auth0/auth0-angular';
import { TemaService } from '../../services/tema.service';

@Component({
  selector: 'app-header',
  imports: [
    RouterLink
  ],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  private readonly auth = inject(AuthService);

  protected readonly tema = inject(TemaService);

  readonly menuOpen = signal(false);

  readonly autenticado = toSignal(this.auth.isAuthenticated$, { initialValue: false });

  private readonly usuario = toSignal(this.auth.user$, { initialValue: null });

  readonly email = computed(() => this.usuario()?.email ?? null);

  toggleMenu(): void {
    this.menuOpen.update((abierto) => !abierto);
  }

  cerrarMenu(): void {
    this.menuOpen.set(false);
  }

  /** El panel es absoluto: sin esto queda abierto sobre el contenido al navegar con el dedo. */
  @HostListener('document:click')
  cerrarMenuAlClickFuera(): void {
    this.cerrarMenu();
  }

  @HostListener('document:keydown.escape')
  cerrarMenuConEscape(): void {
    this.cerrarMenu();
  }

  login(): void {
    this.auth.loginWithRedirect().subscribe({ error: () => undefined });
  }

  logout(): void {
    this.auth
      .logout({ logoutParams: { returnTo: window.location.origin } })
      .subscribe({ error: () => undefined });
  }
}
