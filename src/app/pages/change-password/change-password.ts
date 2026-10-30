import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-change-password',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="password-page">
      <section class="surface password-card">
        <p class="section-kicker">SEGURIDAD DE LA CUENTA</p>
        <h1>Cambiar contraseña</h1>
        <p>{{ auth.user()?.debeCambiarPassword
          ? 'Debés crear una contraseña personal antes de ingresar al sistema.'
          : 'Actualizá tu contraseña cuando lo necesités.' }}</p>
        @if (error()) { <div class="notice error" role="alert">{{ error() }}</div> }
        <form (ngSubmit)="guardar()">
          <label>Contraseña actual
            <input type="password" name="actual" [(ngModel)]="actual" required autocomplete="current-password">
          </label>
          <label>Nueva contraseña
            <input type="password" name="nuevo" [(ngModel)]="nuevo" required minlength="12" maxlength="100" autocomplete="new-password">
          </label>
          <div class="password-checks" aria-live="polite">
            <span [class.valid]="lengthValid()">{{ lengthValid() ? '✓' : '○' }} Entre 12 y 100 caracteres</span>
            <span [class.valid]="hasLetter()">{{ hasLetter() ? '✓' : '○' }} Al menos una letra</span>
            <span [class.valid]="hasDigit()">{{ hasDigit() ? '✓' : '○' }} Al menos un número</span>
            <span [class.valid]="hasSymbol()">{{ hasSymbol() ? '✓' : '○' }} Al menos un símbolo</span>
            <span [class.valid]="isDifferent()">{{ isDifferent() ? '✓' : '○' }} Distinta de la actual y de Temporal2026*</span>
          </div>
          <label>Confirmar nueva contraseña
            <input type="password" name="confirmacion" [(ngModel)]="confirmacion" required autocomplete="new-password">
          </label>
          @if (confirmacion) {
            <p class="match-state" [class.valid]="passwordsMatch()" aria-live="polite">
              {{ passwordsMatch() ? '✓ Las contraseñas coinciden' : '✕ Las contraseñas no coinciden' }}
            </p>
          }
          <div class="form-actions">
            @if (!auth.user()?.debeCambiarPassword) { <a class="btn btn-outline" routerLink="/panel">Cancelar</a> }
            <button class="btn btn-primary" type="submit" [disabled]="loading() || !passwordReady()">{{ loading() ? 'Guardando…' : 'Guardar contraseña' }}</button>
          </div>
        </form>
        <button class="btn btn-quiet" type="button" (click)="salir()">Cerrar sesión</button>
      </section>
    </main>
  `,
  styles: [`
    .password-page { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #f5f8fb; }
    .password-card { width: min(100%, 520px); padding: 30px; }
    h1 { color: #123f63; margin: 0 0 9px; }
    p { color: #657e90; line-height: 1.5; }
    form { display: grid; gap: 17px; margin: 24px 0 15px; }
    .form-actions { margin: 0; }
    .password-checks { display: grid; gap: 7px; margin: -8px 0 0; color: #8a5a20; font-size: 12px; }
    .password-checks .valid, .match-state.valid { color: #18714c; }
    .match-state { margin: -8px 0 0; color: #af3037; font-size: 12px; font-weight: 700; }
  `]
})
export class ChangePassword {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly error = signal('');
  readonly loading = signal(false);
  actual = '';
  nuevo = '';
  confirmacion = '';

  lengthValid(): boolean { return this.nuevo.length >= 12 && this.nuevo.length <= 100; }
  hasLetter(): boolean { return /\p{L}/u.test(this.nuevo); }
  hasDigit(): boolean { return /\p{Nd}/u.test(this.nuevo); }
  hasSymbol(): boolean { return [...this.nuevo].some(c => !/[\p{L}\p{N}]/u.test(c)); }
  isDifferent(): boolean { return !!this.nuevo && !!this.actual && this.nuevo !== this.actual && this.nuevo !== 'Temporal2026*'; }
  passwordsMatch(): boolean { return !!this.confirmacion && this.nuevo === this.confirmacion; }
  passwordReady(): boolean { return !!this.actual && this.lengthValid() && this.hasLetter() && this.hasDigit() && this.hasSymbol() && this.isDifferent() && this.passwordsMatch(); }

  guardar(): void {
    this.error.set('');
    if (!this.actual || !this.nuevo || !this.confirmacion) { this.error.set('Completá todos los campos.'); return; }
    if (this.nuevo !== this.confirmacion) { this.error.set('La confirmación no coincide.'); return; }
    this.loading.set(true);
    this.auth.changePassword(this.actual, this.nuevo, this.confirmacion).subscribe({
      next: () => { this.auth.logout(); void this.router.navigate(['/login'], { queryParams: { passwordUpdated: '1' } }); },
      error: (e: HttpErrorResponse) => { this.loading.set(false); this.error.set(e.error?.message || 'No se pudo cambiar la contraseña.'); }
    });
  }

  salir(): void { this.auth.logout(); void this.router.navigate(['/login']); }
}
