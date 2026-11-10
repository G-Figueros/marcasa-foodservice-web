import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ActualizarCuenta, Cuenta } from '../../core/models';

@Component({
  selector: 'app-account',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-heading"><div><p class="section-kicker">MI PERFIL</p><h1>Información de la cuenta</h1>
      <p>Consultá tus datos y actualizá tu información personal.</p></div>
      <a class="btn btn-outline" routerLink="/panel">← Volver</a></div>
    @if (error()) { <div class="notice error" role="alert">{{ error() }}</div> }
    @if (message()) { <div class="notice success" role="status">{{ message() }}</div> }
    @if (loading()) { <section class="surface empty-state">Cargando tu cuenta…</section> }
    @else if (cuenta()) {
      <section class="surface form-section account-card">
        <div class="surface-header"><h2>Datos personales</h2></div>
        <p class="field-hint">Usuario: <strong>{{ cuenta()?.nombreUsuario }}</strong> · Puesto: <strong>{{ cuenta()?.nombreRol }}</strong></p>
        <form #profileForm="ngForm" (ngSubmit)="guardar()">
          <div class="form-grid">
            <label>Nombres <span class="required">*</span><input name="nombres" [(ngModel)]="form.nombres" required minlength="2" maxlength="120"></label>
            <label>Apellidos<input name="apellidos" [(ngModel)]="form.apellidos" maxlength="120"></label>
            <label>Correo electrónico<input type="email" name="correo" [(ngModel)]="form.correo" maxlength="150"></label>
            <label>Teléfono<input type="tel" name="telefono" [(ngModel)]="form.telefono" maxlength="25"></label>
          </div>
          <div class="form-actions"><button class="btn btn-primary" type="submit" [disabled]="saving() || profileForm.invalid">{{ saving() ? 'Guardando…' : 'Guardar cambios' }}</button></div>
        </form>
      </section>
      <section class="surface form-section account-card">
        <div class="surface-header"><h2>Seguridad</h2></div>
        <p class="field-hint">Para restablecer tu contraseña, ingresá la actual y elegí una nueva.</p>
        <div class="form-actions"><a class="btn btn-outline" routerLink="/cambiar-contrasena">Restablecer contraseña</a></div>
      </section>
    }
  `,
  styles: [`.account-card { max-width: 850px; } .account-card form { margin-top: 22px; }`]
})
export class Account implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  readonly cuenta = signal<Cuenta | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  form: ActualizarCuenta = { nombres: '', apellidos: null, correo: null, telefono: null };

  ngOnInit(): void {
    this.api.cuenta().subscribe({
      next: response => { this.cuenta.set(response.data); this.form = this.toForm(response.data); this.loading.set(false); },
      error: (error: HttpErrorResponse) => { this.error.set(error.error?.message || 'No se pudo cargar la cuenta.'); this.loading.set(false); }
    });
  }

  guardar(): void {
    this.error.set(''); this.message.set(''); this.saving.set(true);
    this.api.actualizarCuenta(this.form).subscribe({
      next: response => {
        this.cuenta.set(response.data); this.form = this.toForm(response.data);
        this.auth.updateProfile(response.data.nombres, response.data.apellidos, response.data.correo);
        this.message.set('Tu información se actualizó.'); this.saving.set(false);
      },
      error: (error: HttpErrorResponse) => { this.error.set(error.error?.message || 'No se pudo actualizar la cuenta.'); this.saving.set(false); }
    });
  }

  private toForm(data: Cuenta): ActualizarCuenta {
    return { nombres: data.nombres, apellidos: data.apellidos, correo: data.correo, telefono: data.telefono };
  }
}
