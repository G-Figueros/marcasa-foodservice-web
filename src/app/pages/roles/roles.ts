import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { PermisoRol, RolAdmin } from '../../core/models';

const protectedManagerCodes = new Set([
  'VER_ROLES', 'CREAR_ROLES', 'EDITAR_ROLES',
  'VER_USUARIOS', 'CREAR_USUARIOS', 'EDITAR_USUARIOS'
]);

const moduleGroups: { title: string; codes: string[] }[] = [
  { title: 'Usuarios', codes: ['VER_USUARIOS', 'CREAR_USUARIOS', 'EDITAR_USUARIOS'] },
  { title: 'Roles', codes: ['VER_ROLES', 'CREAR_ROLES', 'EDITAR_ROLES'] },
  { title: 'Clientes', codes: ['VER_CLIENTES', 'CREAR_CLIENTES', 'EDITAR_CLIENTES'] },
  { title: 'Productos', codes: ['VER_PRODUCTOS', 'EDITAR_PRODUCTOS'] },
  { title: 'Inventario', codes: ['VER_INVENTARIO', 'AGREGAR_STOCK'] },
  { title: 'Pedidos', codes: ['CREAR_PEDIDOS', 'EDITAR_PEDIDOS', 'VER_PEDIDOS_PENDIENTES',
    'AUTORIZAR_PEDIDOS', 'DEVOLVER_PEDIDOS_CORRECCION', 'SOLICITAR_CANCELACION_PEDIDOS',
    'APROBAR_CANCELACION_PEDIDOS'] },
  { title: 'Autorizados y ruta', codes: ['VER_PEDIDOS_AUTORIZADOS', 'EXPORTAR_PDF_RUTA'] },
  { title: 'Entregas', codes: ['VER_PEDIDOS_PENDIENTES_ENTREGA', 'CONFIRMAR_ENTREGA', 'SUBIR_EVIDENCIA_ENTREGA'] },
  { title: 'Reportes', codes: ['VER_REPORTES'] }
];

@Component({
  selector: 'app-roles',
  imports: [FormsModule],
  template: `
    <div class="page-heading"><div><p class="section-kicker">ADMINISTRACIÓN</p><h1>Roles y permisos</h1>
      <p>Definí los módulos y acciones disponibles para cada rol.</p></div>
      @if (auth.can('CREAR_ROLES')) { <button class="btn btn-primary" (click)="nuevo()">＋ Nuevo rol</button> }
    </div>
    @if (error()) { <div class="notice error" role="alert">{{ error() }}</div> }
    @if (message()) { <div class="notice success" role="status">{{ message() }}</div> }
    @if (editing()) {
      <section class="surface role-form">
        <div class="surface-header"><h2>{{ editingId() ? 'Editar rol' : 'Crear rol' }}</h2></div>
        <form #roleForm="ngForm" (ngSubmit)="guardar()">
          <div class="form-grid">
            <label>Nombre del rol <span class="required">*</span>
              <input name="nombre" [(ngModel)]="nombre" required minlength="2" maxlength="50"
                [readonly]="editingManager()" placeholder="Ej. Coordinador de ventas">
              <small>De 2 a 50 caracteres. El nombre Gerente está protegido.</small>
            </label>
            <label>Descripción <span class="optional">Opcional</span>
              <input name="descripcion" [(ngModel)]="descripcion" maxlength="200"
                placeholder="Explicá la función de este rol">
            </label>
          </div>
          <div class="permissions-header"><h3>Acceso a módulos y acciones</h3>
            <p>Marcá lo que este rol podrá ver o realizar. Las opciones sin interfaz actual quedan disponibles para futuras funciones.</p></div>
          @if (loadingPermissions()) { <p class="muted">Cargando permisos…</p> }
          @else {
            <div class="permission-groups">
              @for (group of groupedPermissions(); track group.title) {
                <fieldset class="permission-group"><legend>{{ group.title }}</legend>
                  @for (permission of group.permissions; track permission.permisoId) {
                    <label class="permission-item"><input type="checkbox"
                      [checked]="selectedIds().has(permission.permisoId)"
                      [disabled]="editingManager() && protectedManagerCodes.has(permission.codigo)"
                      (change)="togglePermission(permission.permisoId, $any($event.target).checked)">
                      <span><strong>{{ permission.nombre }}</strong><small>{{ permission.descripcion }}</small></span>
                    </label>
                  }
                </fieldset>
              }
            </div>
          }
          <div class="form-actions"><button type="button" class="btn btn-outline" (click)="cancelar()">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving() || loadingPermissions() || roleForm.invalid">
              {{ saving() ? 'Guardando…' : 'Guardar rol y permisos' }}</button></div>
        </form>
      </section>
    }
    <section class="surface"><div class="surface-header"><h2>Roles registrados</h2><span class="count-chip">{{ roles().length }} roles</span></div>
      @if (loading()) { <div class="empty-state">Cargando roles…</div> }
      @else { <div class="table-wrap"><table><thead><tr><th>Rol</th><th>Descripción</th><th>Usuarios activos</th><th>Permisos</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>@for (role of roles(); track role.rolId) {
          <tr><td><strong>{{ role.nombre }}</strong></td><td>{{ role.descripcion || '—' }}</td>
            <td>{{ role.usuariosActivos }}</td><td>{{ role.permisosHabilitados }}</td>
            <td><span class="status-pill" [class.good]="role.activo">{{ role.activo ? 'Activo' : 'Inactivo' }}</span></td>
            <td><div class="role-actions">
              @if (auth.can('EDITAR_ROLES')) {
                <button class="btn btn-outline" (click)="editar(role)">Editar permisos</button>
                @if (role.nombre !== 'Gerente') {
                  <button class="btn" [class.btn-danger-outline]="role.activo" [class.btn-outline]="!role.activo"
                    (click)="cambiarEstado(role)">{{ role.activo ? 'Desactivar' : 'Activar' }}</button>
                }
              }
            </div></td></tr>
        }</tbody></table></div> }
    </section>
  `,
  styles: [`
    .role-form form { padding: 0 25px 8px; }
    .role-form label small { color: #71899a; font-weight: 400; line-height: 1.4; }
    .optional { color: #71899a; font-size: 11px; font-weight: 400; }
    .permissions-header { margin: 26px 0 14px; }
    .permissions-header h3 { color: #123f63; margin: 0 0 6px; font-size: 17px; }
    .permissions-header p { color: #71899a; font-size: 12px; margin: 0; }
    .permission-groups { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .permission-group { border: 1px solid #dce7ee; border-radius: 10px; padding: 12px 16px 16px; margin: 0; }
    .permission-group legend { color: #123f63; font-size: 13px; font-weight: 800; padding: 0 5px; }
    .permission-item { display: flex; align-items: flex-start; gap: 10px; margin: 9px 0; }
    .permission-item input { margin-top: 2px; width: 17px; height: 17px; flex: 0 0 auto; }
    .permission-item span { display: grid; gap: 3px; }.permission-item strong { font-size: 12px; }
    .permission-item small { color: #71899a; font-size: 11px; font-weight: 400; }
    .role-actions { display: flex; flex-wrap: wrap; gap: 6px; }
    .role-actions .btn { padding: 7px 10px; min-height: 34px; font-size: 11px; }
    @media (max-width: 800px) { .permission-groups { grid-template-columns: 1fr; } }
  `]
})
export class Roles implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly protectedManagerCodes = protectedManagerCodes;
  readonly roles = signal<RolAdmin[]>([]);
  readonly permissions = signal<PermisoRol[]>([]);
  readonly selectedIds = signal<Set<number>>(new Set());
  readonly loading = signal(true);
  readonly loadingPermissions = signal(false);
  readonly saving = signal(false);
  readonly editing = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly error = signal('');
  readonly message = signal('');
  nombre = '';
  descripcion = '';

  ngOnInit(): void { this.load(); }
  editingManager(): boolean { return this.editingId() !== null && this.roles().some(r => r.rolId === this.editingId() && r.nombre === 'Gerente'); }
  groupedPermissions(): { title: string; permissions: PermisoRol[] }[] {
    const assigned = new Set(moduleGroups.flatMap(group => group.codes));
    const groups = moduleGroups.map(group => ({ title: group.title,
      permissions: group.codes.map(code => this.permissions().find(p => p.codigo === code)).filter((p): p is PermisoRol => !!p) }));
    const extra = this.permissions().filter(p => !assigned.has(p.codigo));
    if (extra.length) groups.push({ title: 'Otros permisos', permissions: extra });
    return groups.filter(group => group.permissions.length);
  }
  load(): void {
    this.loading.set(true);
    this.api.rolesAdmin().subscribe({
      next: response => { this.roles.set(response.data); this.loading.set(false); },
      error: e => { this.error.set(this.errorText(e)); this.loading.set(false); }
    });
  }
  nuevo(): void {
    this.nombre = ''; this.descripcion = ''; this.editingId.set(null); this.editing.set(true);
    this.error.set(''); this.message.set(''); this.loadPermissions();
  }
  editar(role: RolAdmin): void {
    this.nombre = role.nombre; this.descripcion = role.descripcion || '';
    this.editingId.set(role.rolId); this.editing.set(true);
    this.error.set(''); this.message.set(''); this.loadPermissions(role.rolId);
  }
  cancelar(): void { this.editing.set(false); this.editingId.set(null); }
  togglePermission(id: number, checked: boolean): void {
    const next = new Set(this.selectedIds());
    if (checked) next.add(id); else next.delete(id);
    this.selectedIds.set(next);
  }
  guardar(): void {
    this.error.set(''); this.message.set('');
    if (this.nombre.trim().length < 2 || this.nombre.trim().length > 50) {
      this.error.set('El nombre debe tener entre 2 y 50 caracteres.'); return;
    }
    const id = this.editingId();
    const data = { nombre: this.nombre.trim(), descripcion: this.descripcion.trim() || null,
      permisoIds: [...this.selectedIds()] };
    this.saving.set(true);
    const operation = id ? this.api.editarRol(id, data) : this.api.crearRol(data);
    operation.subscribe({
      next: () => {
        this.saving.set(false); this.cancelar();
        if (this.editingManager() || (id && id === this.auth.user()?.rolId)) {
          this.auth.logout(); void this.router.navigate(['/login']); return;
        }
        this.message.set(id ? 'Rol y permisos actualizados.' : 'Rol creado. Ya se puede asignar a usuarios.');
        this.load();
      }, error: e => { this.saving.set(false); this.error.set(this.errorText(e)); }
    });
  }
  cambiarEstado(role: RolAdmin): void {
    const text = role.activo
      ? `¿Desactivar ${role.nombre}? Sus ${role.usuariosActivos} usuarios activos no podrán ingresar hasta reactivarlo.`
      : `¿Activar ${role.nombre}?`;
    if (!confirm(text)) return;
    this.error.set(''); this.message.set('');
    this.api.estadoRol(role.rolId, !role.activo).subscribe({
      next: () => { this.message.set(role.activo ? 'Rol desactivado.' : 'Rol activado.'); this.load(); },
      error: e => this.error.set(this.errorText(e))
    });
  }
  private loadPermissions(rolId?: number): void {
    this.loadingPermissions.set(true);
    this.api.permisosRol(rolId).subscribe({
      next: response => { this.permissions.set(response.data);
        this.selectedIds.set(new Set(response.data.filter(p => p.habilitado).map(p => p.permisoId)));
        this.loadingPermissions.set(false); },
      error: e => { this.error.set(this.errorText(e)); this.loadingPermissions.set(false); }
    });
  }
  private errorText(e: HttpErrorResponse): string { return e.error?.message || 'No se pudo completar la operación.'; }
}
