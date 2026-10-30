import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { GuardarUsuario, RolUsuario, UsuarioAdmin } from '../../core/models';

const emptyForm = (): GuardarUsuario => ({ nombreUsuario: '', nombres: '', apellidos: null,
  correo: null, telefono: null, rolId: 0 });

@Component({
  selector: 'app-users',
  imports: [FormsModule],
  template: `
    <div class="page-heading"><div><p class="section-kicker">ADMINISTRACIÓN</p><h1>Usuarios</h1>
      <p>Creá cuentas, asigná roles y controlá quién puede ingresar.</p></div>
      @if (auth.can('CREAR_USUARIOS')) { <button class="btn btn-primary" (click)="nuevo()">＋ Nuevo usuario</button> }
    </div>
    @if (error()) { <div class="notice error" role="alert">{{ error() }}</div> }
    @if (message()) { <div class="notice success" role="status">{{ message() }}</div> }
    @if (editing()) {
      <section class="surface form-section">
        <div class="surface-header"><h2>{{ editingId() ? 'Editar usuario' : 'Crear usuario' }}</h2></div>
        <form #userForm="ngForm" (ngSubmit)="guardar()">
          <p class="field-hint">Los campos marcados con <strong>*</strong> son obligatorios.</p>
          <div class="form-grid">
            <label>Nombre de usuario <span class="required">*</span><input name="nombreUsuario" [(ngModel)]="form.nombreUsuario" #userNameControl="ngModel" required minlength="3" maxlength="60" pattern="[a-zA-Z0-9._-]+" placeholder="Ej. maria.lopez" autocomplete="off" aria-describedby="usuario-hint">
              <small id="usuario-hint">De 3 a 60 caracteres: letras, números, punto, guion o guion bajo.</small>
              @if (userNameControl.invalid && userNameControl.touched) { <small class="field-error">Ingresá un usuario válido.</small> }
            </label>
            <label>Rol <span class="required">*</span><select name="rolId" [(ngModel)]="form.rolId" required><option [ngValue]="0" disabled>Seleccioná un rol</option>
              @for (role of roles(); track role.rolId) { <option [ngValue]="role.rolId">{{ role.nombre }}</option> }
            </select><small>Define los módulos y acciones disponibles para la cuenta.</small></label>
            <label>Nombres <span class="required">*</span><input name="nombres" [(ngModel)]="form.nombres" #namesControl="ngModel" required minlength="2" maxlength="120" placeholder="Ej. María Fernanda">
              <small>Nombre o nombres de la persona, de 2 a 120 caracteres.</small>
              @if (namesControl.invalid && namesControl.touched) { <small class="field-error">Ingresá al menos 2 caracteres.</small> }
            </label>
            <label>Apellidos <span class="optional">Opcional</span><input name="apellidos" [(ngModel)]="form.apellidos" maxlength="120" placeholder="Ej. López García"></label>
            <label>Correo electrónico <span class="optional">Opcional</span><input type="email" name="correo" [(ngModel)]="form.correo" #mailControl="ngModel" maxlength="150" placeholder="Ej. maria@empresa.com">
              @if (mailControl.invalid && mailControl.touched) { <small class="field-error">Ingresá un correo válido.</small> }
            </label>
            <label>Teléfono <span class="optional">Opcional</span><input type="tel" name="telefono" [(ngModel)]="form.telefono" maxlength="25" placeholder="Ej. 5555 1234"><small>Hasta 25 caracteres.</small></label>
          </div>
          @if (!editingId()) { <p class="field-hint">Contraseña inicial: <strong>Temporal2026*</strong>. El usuario deberá cambiarla al ingresar.</p> }
          <div class="form-actions"><button type="button" class="btn btn-outline" (click)="cancelar()">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving() || userForm.invalid || !form.rolId">{{ saving() ? 'Guardando…' : 'Guardar usuario' }}</button></div>
        </form>
      </section>
    }
    <section class="surface">
      <div class="surface-header"><h2>Listado de usuarios</h2><span class="count-chip">{{ users().length }} cuentas</span></div>
      @if (loading()) { <div class="empty-state">Cargando usuarios…</div> }
      @else if (!users().length) { <div class="empty-state"><strong>No hay usuarios para mostrar</strong></div> }
      @else { <div class="table-wrap"><table><thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Estado</th><th>Contraseña</th><th>Acciones</th></tr></thead>
        <tbody>@for (user of users(); track user.usuarioId) {
          <tr><td><strong>{{ user.nombreUsuario }}</strong><small>{{ user.correo || 'Sin correo' }}</small></td>
            <td>{{ user.nombres }} {{ user.apellidos }}</td><td>{{ user.nombreRol }}</td>
            <td><span class="status-pill" [class.good]="user.activo">{{ user.activo ? 'Activo' : 'Inactivo' }}</span></td>
            <td>@if (user.debeCambiarPassword) { <span class="status-pill warn">Cambio pendiente</span> } @else { Actualizada }</td>
            <td><div class="user-actions">
              @if (auth.can('EDITAR_USUARIOS')) {
                <button class="btn btn-outline" (click)="editar(user)">Editar</button>
                <button class="btn btn-outline" (click)="reiniciar(user)">Reiniciar contraseña</button>
                <button class="btn" [class.btn-danger-outline]="user.activo" [class.btn-outline]="!user.activo"
                  [disabled]="user.usuarioId === auth.user()?.usuarioId && user.activo" (click)="cambiarEstado(user)">{{ user.activo ? 'Desactivar' : 'Activar' }}</button>
              }
            </div></td>
          </tr>
        }</tbody></table></div> }
    </section>
  `,
  styles: [`.user-actions { display: flex; flex-wrap: wrap; gap: 6px; } .user-actions .btn { padding: 7px 10px; min-height: 34px; font-size: 11px; }
    .form-section form { padding: 0 25px 4px; } .form-section .form-grid { margin-top: 5px; }
    .status-pill.warn { background: #fff2df; color: #a76c1f; }
    .form-grid label small { color: #71899a; font-weight: 400; line-height: 1.4; }
    .form-grid label .field-error { color: #ac2632; font-weight: 700; }
    .optional { color: #71899a; font-size: 11px; font-weight: 400; }`]
})
export class Users implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly users = signal<UsuarioAdmin[]>([]);
  readonly roles = signal<RolUsuario[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editing = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly error = signal('');
  readonly message = signal('');
  form = emptyForm();

  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading.set(true);
    forkJoin({ users: this.api.usuarios(), roles: this.api.rolesUsuarios() }).subscribe({
      next: data => { this.users.set(data.users.data); this.roles.set(data.roles.data); this.loading.set(false); },
      error: e => { this.error.set(this.errorText(e)); this.loading.set(false); }
    });
  }
  nuevo(): void { this.form = emptyForm(); this.editingId.set(null); this.editing.set(true); this.error.set(''); this.message.set(''); }
  editar(user: UsuarioAdmin): void {
    this.form = { nombreUsuario: user.nombreUsuario, nombres: user.nombres, apellidos: user.apellidos,
      correo: user.correo, telefono: user.telefono, rolId: user.rolId };
    this.editingId.set(user.usuarioId); this.editing.set(true); this.error.set(''); this.message.set('');
  }
  cancelar(): void { this.editing.set(false); this.editingId.set(null); }
  guardar(): void {
    this.error.set(''); this.message.set('');
    if (!/^[a-zA-Z0-9._-]{3,60}$/.test(this.form.nombreUsuario.trim()) || !this.form.nombres.trim() || !this.form.rolId) {
      this.error.set('Completá usuario, nombres y rol con datos válidos.'); return;
    }
    this.saving.set(true);
    const id = this.editingId();
    const operation = id ? this.api.editarUsuario(id, this.form) : this.api.crearUsuario(this.form);
    operation.subscribe({
      next: () => {
        this.saving.set(false); this.cancelar();
        if (id === this.auth.user()?.usuarioId) { this.auth.logout(); void this.router.navigate(['/login']); return; }
        this.message.set(id ? 'Usuario actualizado.' : 'Usuario creado. Contraseña inicial: Temporal2026*. Deberá cambiarla al ingresar.');
        this.load();
      }, error: e => { this.saving.set(false); this.error.set(this.errorText(e)); }
    });
  }
  cambiarEstado(user: UsuarioAdmin): void {
    if (!confirm(`${user.activo ? 'Desactivar' : 'Activar'} a ${user.nombreUsuario}?`)) return;
    this.error.set(''); this.message.set('');
    this.api.estadoUsuario(user.usuarioId, !user.activo).subscribe({
      next: () => { this.message.set(user.activo ? 'Usuario desactivado.' : 'Usuario activado.'); this.load(); },
      error: e => this.error.set(this.errorText(e))
    });
  }
  reiniciar(user: UsuarioAdmin): void {
    if (!confirm(`¿Reiniciar la contraseña de ${user.nombreUsuario} a Temporal2026*?`)) return;
    this.error.set(''); this.message.set('');
    this.api.reiniciarPassword(user.usuarioId).subscribe({
      next: () => {
        if (user.usuarioId === this.auth.user()?.usuarioId) { this.auth.logout(); void this.router.navigate(['/login']); return; }
        this.message.set(`Contraseña de ${user.nombreUsuario} reiniciada a Temporal2026*. Deberá cambiarla al ingresar.`);
        this.load();
      }, error: e => this.error.set(this.errorText(e))
    });
  }
  private errorText(e: HttpErrorResponse): string { return e.error?.message || 'No se pudo completar la operación.'; }
}
