import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AjustarInventario, ApiResponse, Cliente, GuardarCliente, GuardarProducto, Inventario, Producto } from '../../core/models';
import { AuthService } from '../../core/auth.service';

type CatalogKind = 'clientes' | 'productos' | 'inventario';
const emptyClient = (): GuardarCliente => ({ codigoCliente: '', nombreComercial: '', razonSocial: null,
  nit: null, contacto: null, telefono: null, direccion: null, observaciones: null });
const emptyProduct = (): GuardarProducto => ({ codigoProducto: '', nombre: '', permitePesoNeto: true,
  permitePesoBruto: false, pesoNetoBolsaLbs: null, pesoBrutoBolsaLbs: null, sePesaAlDespachar: false });

@Component({
  selector: 'app-catalog',
  imports: [FormsModule],
  template: `
    <div class="page-heading"><div><p class="section-kicker">CATÁLOGOS</p><h1>{{ title }}</h1><p>{{ description }}</p></div>
      <div class="catalog-actions"><span class="count-chip">{{ count() }} registros</span>
        @if (kind === 'clientes' && canCreateClients()) { <button class="btn btn-primary" (click)="nuevoCliente()">＋ Nuevo cliente</button> }
        @if (kind === 'productos' && canProducts()) { <button class="btn btn-primary" (click)="nuevoProducto()">＋ Nuevo producto</button> }
      </div></div>
    @if (error()) { <div class="notice error" role="alert">{{ error() }}</div> }
    @if (message()) { <div class="notice success" role="status">{{ message() }}</div> }
    @if (kind === 'clientes' && clientOpen()) {
      <section class="surface catalog-form"><div class="surface-header"><h2>{{ clientId() ? 'Editar cliente' : 'Nuevo cliente' }}</h2></div>
        <form #clientForm="ngForm" (ngSubmit)="guardarCliente()">
          <p class="field-hint">Los campos marcados con <strong>*</strong> son obligatorios.</p>
          <div class="form-grid">
            <label>Código de cliente <span class="required">*</span><input name="codigoCliente" [(ngModel)]="clientFormData.codigoCliente" required maxlength="30" placeholder="Ej. CLI-001"></label>
            <label>Nombre comercial <span class="required">*</span><input name="nombreComercial" [(ngModel)]="clientFormData.nombreComercial" required minlength="2" maxlength="180" placeholder="Ej. Restaurante Central"></label>
            <label>Razón social<input name="razonSocial" [(ngModel)]="clientFormData.razonSocial" maxlength="180" placeholder="Nombre legal, si aplica"></label>
            <label>NIT<input name="nit" [(ngModel)]="clientFormData.nit" maxlength="30" placeholder="Número de identificación tributaria"></label>
            <label>Persona de contacto<input name="contacto" [(ngModel)]="clientFormData.contacto" maxlength="120" placeholder="Nombre de quien recibe los pedidos"></label>
            <label>Teléfono<input type="tel" name="telefono" [(ngModel)]="clientFormData.telefono" maxlength="25" placeholder="Ej. 5555 1234"></label>
          </div>
          <label class="stock-reason">Dirección<textarea name="direccion" [(ngModel)]="clientFormData.direccion" maxlength="300" rows="2" placeholder="Dirección para entregas"></textarea></label>
          <label class="stock-reason">Observaciones<textarea name="observaciones" [(ngModel)]="clientFormData.observaciones" maxlength="500" rows="2" placeholder="Indicaciones adicionales"></textarea></label>
          <div class="form-actions"><button type="button" class="btn btn-outline" (click)="clientOpen.set(false)">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving() || clientForm.invalid">{{ saving() ? 'Guardando…' : 'Guardar cliente' }}</button></div>
        </form>
      </section>
    }
    @if (kind === 'productos' && productOpen()) {
      <section class="surface catalog-form"><div class="surface-header"><h2>{{ productId() ? 'Editar producto' : 'Nuevo producto' }}</h2></div>
        <form #productForm="ngForm" (ngSubmit)="guardarProducto()">
          <p class="field-hint">Los campos marcados con * son obligatorios. Un producto nuevo comienza con inventario en cero.</p>
          <div class="form-grid">
            <label>Código <span class="required">*</span><input name="codigo" [(ngModel)]="productFormData.codigoProducto" required maxlength="30" placeholder="Ej. PRO-001"></label>
            <label>Nombre <span class="required">*</span><input name="nombre" [(ngModel)]="productFormData.nombre" required minlength="2" maxlength="180" placeholder="Ej. Producto de alimentos"></label>
            <label>Peso neto por bolsa (lb)<input type="number" name="pesoNeto" [(ngModel)]="productFormData.pesoNetoBolsaLbs" min="0.01" step="0.01" placeholder="Opcional"></label>
            <label>Peso bruto por bolsa (lb)<input type="number" name="pesoBruto" [(ngModel)]="productFormData.pesoBrutoBolsaLbs" min="0.01" step="0.01" placeholder="Opcional"></label>
          </div>
          <div class="catalog-checks">
            <label><input type="checkbox" name="neto" [(ngModel)]="productFormData.permitePesoNeto"> Permite peso neto</label>
            <label><input type="checkbox" name="bruto" [(ngModel)]="productFormData.permitePesoBruto"> Permite peso bruto</label>
            <label><input type="checkbox" name="despacho" [(ngModel)]="productFormData.sePesaAlDespachar"> Se pesa al despachar</label>
          </div>
          <div class="form-actions"><button type="button" class="btn btn-outline" (click)="productOpen.set(false)">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving() || productForm.invalid || (!productFormData.permitePesoNeto && !productFormData.permitePesoBruto)">{{ saving() ? 'Guardando…' : 'Guardar producto' }}</button></div>
        </form>
      </section>
    }
    @if (kind === 'inventario' && inventoryOpen()) {
      <section class="surface catalog-form"><div class="surface-header"><h2>Ajustar inventario · {{ inventoryItem()?.nombre }}</h2></div>
        <p class="field-hint">Editá solo la cantidad disponible. Las existencias reservadas para pedidos permanecen intactas.</p>
        <form #stockForm="ngForm" (ngSubmit)="guardarInventario()">
          <div class="form-grid">
            <label>Libras disponibles <span class="required">*</span><input type="number" name="libras" [(ngModel)]="stockFormData.stockDisponibleLbs" min="0" step="0.01" required></label>
            <label>Bolsas disponibles <span class="required">*</span><input type="number" name="bolsas" [(ngModel)]="stockFormData.cantidadBolsasDisponible" min="0" step="1" required></label>
          </div>
          <label class="stock-reason">Motivo del ajuste <span class="required">*</span><textarea name="motivo" [(ngModel)]="stockFormData.observacion" required minlength="5" maxlength="300" rows="2" placeholder="Ej. Conteo físico o ingreso de mercancía"></textarea></label>
          <div class="form-actions"><button type="button" class="btn btn-outline" (click)="inventoryOpen.set(false)">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving() || stockForm.invalid">{{ saving() ? 'Guardando…' : 'Guardar ajuste' }}</button></div>
        </form>
      </section>
    }
    <section class="surface">
      <div class="toolbar"><label class="search-field"><span>⌕</span><input [(ngModel)]="search" (keyup.enter)="load()" [placeholder]="kind === 'clientes' ? 'Buscar código, nombre o NIT' : 'Buscar código o nombre'" aria-label="Buscar"></label><button class="btn btn-primary" (click)="load()">Buscar</button><button class="btn btn-outline" (click)="clear()">Limpiar</button></div>
      @if (loading()) { <div class="empty-state">Cargando {{ title.toLowerCase() }}…</div> }
      @else if (count() === 0) { <div class="empty-state"><strong>Sin resultados</strong><span>Probá otro término de búsqueda.</span></div> }
      @else { <div class="table-wrap"><table>
        @if (kind === 'clientes') {
          <thead><tr><th>Código</th><th>Cliente</th><th>NIT</th><th>Contacto</th><th>Teléfono</th><th>Dirección</th><th>Estado</th>@if (canEditClients()) { <th>Acciones</th> }</tr></thead>
          <tbody>@for (item of clientes(); track item.clienteId) { <tr><td class="mono">{{ item.codigoCliente }}</td><td><strong>{{ item.nombreComercial }}</strong><small>{{ item.razonSocial || '—' }}</small></td><td>{{ item.nit || '—' }}</td><td>{{ item.contacto || '—' }}</td><td>{{ item.telefono || '—' }}</td><td>{{ item.direccion || '—' }}</td><td><span class="status-pill" [class.good]="item.activo" [class.warn]="!item.activo">{{ item.activo ? 'Activo' : 'Inactivo · sin pedidos nuevos' }}</span></td>
            @if (canEditClients()) { <td><div class="catalog-actions"><button class="btn btn-outline" (click)="editarCliente(item)">Editar</button><button class="btn" [class.btn-danger-outline]="item.activo" [class.btn-outline]="!item.activo" (click)="cambiarEstadoCliente(item)">{{ item.activo ? 'Desactivar' : 'Activar' }}</button></div></td> }</tr> }</tbody>
        } @else if (kind === 'productos') {
          <thead><tr><th>Código</th><th>Producto</th><th>Tipos de peso</th><th>Bolsa neta</th><th>Bolsa bruta</th><th>Despacho</th><th>Estado</th>@if (canProducts()) { <th>Acciones</th> }</tr></thead>
          <tbody>@for (item of productos(); track item.productoId) { <tr><td class="mono">{{ item.codigoProducto }}</td><td><strong>{{ item.nombre }}</strong></td><td>{{ item.permitePesoNeto ? 'Neto' : '' }}{{ item.permitePesoNeto && item.permitePesoBruto ? ' · ' : '' }}{{ item.permitePesoBruto ? 'Bruto' : '' }}</td><td>{{ item.pesoNetoBolsaLbs ?? '—' }} lb</td><td>{{ item.pesoBrutoBolsaLbs ?? '—' }} lb</td><td>{{ item.sePesaAlDespachar ? 'Se pesa' : 'Estándar' }}</td><td><span class="status-pill" [class.good]="item.activo" [class.warn]="!item.activo">{{ item.activo ? 'En venta' : 'No está en venta' }}</span></td>
            @if (canProducts()) { <td><div class="catalog-actions"><button class="btn btn-outline" (click)="editarProducto(item)">Editar</button><button class="btn" [class.btn-danger-outline]="item.activo" [class.btn-outline]="!item.activo" (click)="cambiarEstado(item)">{{ item.activo ? 'Desactivar' : 'Activar' }}</button></div></td> }</tr> }</tbody>
        } @else {
          <thead><tr><th>Código</th><th>Producto</th><th>Disponible</th><th>Reservado</th><th>Total</th><th>Bolsas disp.</th><th>Estado</th><th>Actualización</th>@if (canInventory()) { <th>Acción</th> }</tr></thead>
          <tbody>@for (item of inventario(); track item.inventarioId) { <tr><td class="mono">{{ item.codigoProducto }}</td><td><strong>{{ item.nombre }}</strong></td><td><strong>{{ item.stockDisponibleLbs.toLocaleString('es-GT') }} lb</strong></td><td>{{ item.stockReservadoLbs.toLocaleString('es-GT') }} lb</td><td>{{ item.stockTotalLbs.toLocaleString('es-GT') }} lb</td><td>{{ item.cantidadBolsasDisponible }}</td><td><span class="status-pill" [class.good]="item.activo" [class.warn]="!item.activo">{{ item.activo ? 'En venta' : 'No está en venta' }}</span></td><td>{{ item.ultimaActualizacion?.slice(0, 10) }}</td>
            @if (canInventory()) { <td><button class="btn btn-outline" (click)="editarInventario(item)">Ajustar</button></td> }</tr> }</tbody>
        }
      </table></div> }
    </section>
  `
})
export class Catalog implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  readonly kind = this.route.snapshot.data['kind'] as CatalogKind;
  readonly title = { clientes: 'Clientes', productos: 'Productos', inventario: 'Inventario' }[this.kind];
  readonly description = { clientes: 'Directorio de clientes. Los inactivos no pueden recibir pedidos nuevos.', productos: 'Catálogo de productos; los inactivos no están en venta.', inventario: 'Existencias disponibles y reservadas por producto.' }[this.kind];
  readonly clientes = signal<Cliente[]>([]);
  readonly productos = signal<Producto[]>([]);
  readonly inventario = signal<Inventario[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly saving = signal(false);
  readonly productOpen = signal(false);
  readonly clientOpen = signal(false);
  readonly clientId = signal<number | null>(null);
  readonly productId = signal<number | null>(null);
  readonly inventoryOpen = signal(false);
  readonly inventoryItem = signal<Inventario | null>(null);
  productFormData = emptyProduct();
  clientFormData = emptyClient();
  stockFormData: AjustarInventario = { stockDisponibleLbs: 0, cantidadBolsasDisponible: 0, observacion: '' };
  search = '';

  count(): number {
    return this.kind === 'clientes' ? this.clientes().length : this.kind === 'productos' ? this.productos().length : this.inventario().length;
  }
  canProducts(): boolean { return ['Gerente', 'Supervisora'].includes(this.auth.user()?.nombreRol || '') && this.auth.can('EDITAR_PRODUCTOS'); }
  canCreateClients(): boolean { return ['Gerente', 'Supervisora'].includes(this.auth.user()?.nombreRol || '') && this.auth.can('CREAR_CLIENTES'); }
  canEditClients(): boolean { return ['Gerente', 'Supervisora'].includes(this.auth.user()?.nombreRol || '') && this.auth.can('EDITAR_CLIENTES'); }
  canInventory(): boolean { return ['Gerente', 'Supervisora'].includes(this.auth.user()?.nombreRol || '') && this.auth.can('AGREGAR_STOCK'); }

  ngOnInit(): void { this.load(); }
  clear(): void { this.search = ''; this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    const request: Observable<ApiResponse<Cliente[] | Producto[] | Inventario[]>> = this.kind === 'clientes' ? this.api.clientes(this.search.trim(), false)
      : this.kind === 'productos' ? this.api.productos(this.search.trim(), false) : this.api.inventario(this.search.trim(), false);
    request.subscribe({
      next: response => {
        if (this.kind === 'clientes') this.clientes.set(response.data as Cliente[]);
        else if (this.kind === 'productos') this.productos.set(response.data as Producto[]);
        else this.inventario.set(response.data as Inventario[]);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => { this.error.set(error.error?.message || 'No se pudo consultar el catálogo.'); this.loading.set(false); }
    });
  }

  nuevoCliente(): void {
    this.clientId.set(null); this.clientFormData = emptyClient(); this.clientOpen.set(true);
    this.error.set(''); this.message.set('');
  }
  editarCliente(item: Cliente): void {
    this.clientId.set(item.clienteId);
    this.clientFormData = { codigoCliente: item.codigoCliente, nombreComercial: item.nombreComercial,
      razonSocial: item.razonSocial, nit: item.nit, contacto: item.contacto,
      telefono: item.telefono, direccion: item.direccion, observaciones: item.observaciones };
    this.clientOpen.set(true); this.error.set(''); this.message.set('');
  }
  guardarCliente(): void {
    this.error.set(''); this.message.set('');
    if (!this.clientFormData.codigoCliente.trim() || this.clientFormData.nombreComercial.trim().length < 2) {
      this.error.set('Ingresá el código y el nombre comercial del cliente.'); return;
    }
    this.saving.set(true);
    const id = this.clientId();
    (id ? this.api.editarCliente(id, this.clientFormData) : this.api.crearCliente(this.clientFormData)).subscribe({
      next: () => { this.saving.set(false); this.clientOpen.set(false); this.message.set(id ? 'Cliente actualizado.' : 'Cliente creado.'); this.load(); },
      error: (error: HttpErrorResponse) => { this.saving.set(false); this.error.set(error.error?.message || 'No se pudo guardar el cliente.'); }
    });
  }
  cambiarEstadoCliente(item: Cliente): void {
    if (!confirm(`${item.activo ? 'Desactivar' : 'Activar'} a ${item.nombreComercial}?`)) return;
    this.error.set(''); this.message.set('');
    this.api.estadoCliente(item.clienteId, !item.activo).subscribe({
      next: () => { this.message.set(item.activo ? 'Cliente desactivado. No recibirá pedidos nuevos.' : 'Cliente activado.'); this.load(); },
      error: (error: HttpErrorResponse) => this.error.set(error.error?.message || 'No se pudo cambiar el estado del cliente.')
    });
  }

  nuevoProducto(): void { this.productId.set(null); this.productFormData = emptyProduct(); this.productOpen.set(true); this.error.set(''); this.message.set(''); }
  editarProducto(item: Producto): void {
    this.productId.set(item.productoId);
    this.productFormData = { codigoProducto: item.codigoProducto, nombre: item.nombre,
      permitePesoNeto: item.permitePesoNeto, permitePesoBruto: item.permitePesoBruto,
      pesoNetoBolsaLbs: item.pesoNetoBolsaLbs, pesoBrutoBolsaLbs: item.pesoBrutoBolsaLbs,
      sePesaAlDespachar: item.sePesaAlDespachar };
    this.productOpen.set(true); this.error.set(''); this.message.set('');
  }
  guardarProducto(): void {
    this.error.set(''); this.message.set(''); this.saving.set(true);
    const id = this.productId();
    (id ? this.api.editarProducto(id, this.productFormData) : this.api.crearProducto(this.productFormData)).subscribe({
      next: () => { this.saving.set(false); this.productOpen.set(false); this.message.set(id ? 'Producto actualizado.' : 'Producto creado con inventario en cero.'); this.load(); },
      error: (error: HttpErrorResponse) => { this.saving.set(false); this.error.set(error.error?.message || 'No se pudo guardar el producto.'); }
    });
  }
  cambiarEstado(item: Producto): void {
    if (!confirm(`${item.activo ? 'Desactivar' : 'Activar'} ${item.nombre}?`)) return;
    this.error.set(''); this.message.set('');
    this.api.estadoProducto(item.productoId, !item.activo).subscribe({
      next: () => { this.message.set(item.activo ? 'Producto fuera de venta.' : 'Producto disponible para venta.'); this.load(); },
      error: (error: HttpErrorResponse) => this.error.set(error.error?.message || 'No se pudo cambiar el estado.')
    });
  }
  editarInventario(item: Inventario): void {
    this.inventoryItem.set(item);
    this.stockFormData = { stockDisponibleLbs: item.stockDisponibleLbs,
      cantidadBolsasDisponible: item.cantidadBolsasDisponible, observacion: '' };
    this.inventoryOpen.set(true); this.error.set(''); this.message.set('');
  }
  guardarInventario(): void {
    const item = this.inventoryItem(); if (!item) return;
    this.error.set(''); this.message.set('');
    if (!Number.isInteger(Number(this.stockFormData.cantidadBolsasDisponible)) ||
        this.stockFormData.stockDisponibleLbs < 0 || this.stockFormData.cantidadBolsasDisponible < 0) {
      this.error.set('Ingresá cantidades válidas.'); return;
    }
    this.saving.set(true);
    this.api.ajustarInventario(item.inventarioId, this.stockFormData).subscribe({
      next: () => { this.saving.set(false); this.inventoryOpen.set(false); this.message.set('Inventario actualizado. El ajuste quedó registrado.'); this.load(); },
      error: (error: HttpErrorResponse) => { this.saving.set(false); this.error.set(error.error?.message || 'No se pudo ajustar el inventario.'); }
    });
  }
}
