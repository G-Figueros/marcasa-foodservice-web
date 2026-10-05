import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ApiResponse, Cliente, Inventario, Producto } from '../../core/models';

type CatalogKind = 'clientes' | 'productos' | 'inventario';

@Component({
  selector: 'app-catalog',
  imports: [FormsModule],
  template: `
    <div class="page-heading"><div><p class="section-kicker">CATÁLOGOS</p><h1>{{ title }}</h1><p>{{ description }}</p></div><span class="count-chip">{{ count() }} registros</span></div>
    <section class="surface">
      <div class="toolbar"><label class="search-field"><span>⌕</span><input [(ngModel)]="search" (keyup.enter)="load()" [placeholder]="kind === 'clientes' ? 'Buscar código, nombre o NIT' : 'Buscar código o nombre'" aria-label="Buscar"></label><button class="btn btn-primary" (click)="load()">Buscar</button><button class="btn btn-outline" (click)="clear()">Limpiar</button></div>
      @if (error()) { <div class="notice error" role="alert">{{ error() }}</div> }
      @if (loading()) { <div class="empty-state">Cargando {{ title.toLowerCase() }}…</div> }
      @else if (count() === 0) { <div class="empty-state"><strong>Sin resultados</strong><span>Probá otro término de búsqueda.</span></div> }
      @else { <div class="table-wrap"><table>
        @if (kind === 'clientes') {
          <thead><tr><th>Código</th><th>Cliente</th><th>NIT</th><th>Contacto</th><th>Teléfono</th><th>Estado</th></tr></thead>
          <tbody>@for (item of clientes(); track item.clienteId) { <tr><td class="mono">{{ item.codigoCliente }}</td><td><strong>{{ item.nombreComercial }}</strong><small>{{ item.razonSocial || '—' }}</small></td><td>{{ item.nit || '—' }}</td><td>{{ item.contacto || '—' }}</td><td>{{ item.telefono || '—' }}</td><td><span class="status-pill good">Activo</span></td></tr> }</tbody>
        } @else if (kind === 'productos') {
          <thead><tr><th>Código</th><th>Producto</th><th>Tipos de peso</th><th>Bolsa neta</th><th>Bolsa bruta</th><th>Despacho</th></tr></thead>
          <tbody>@for (item of productos(); track item.productoId) { <tr><td class="mono">{{ item.codigoProducto }}</td><td><strong>{{ item.nombre }}</strong></td><td>{{ item.permitePesoNeto ? 'Neto' : '' }}{{ item.permitePesoNeto && item.permitePesoBruto ? ' · ' : '' }}{{ item.permitePesoBruto ? 'Bruto' : '' }}</td><td>{{ item.pesoNetoBolsaLbs ?? '—' }} lb</td><td>{{ item.pesoBrutoBolsaLbs ?? '—' }} lb</td><td>{{ item.sePesaAlDespachar ? 'Se pesa' : 'Estándar' }}</td></tr> }</tbody>
        } @else {
          <thead><tr><th>Código</th><th>Producto</th><th>Disponible</th><th>Reservado</th><th>Total</th><th>Bolsas disp.</th><th>Actualización</th></tr></thead>
          <tbody>@for (item of inventario(); track item.inventarioId) { <tr><td class="mono">{{ item.codigoProducto }}</td><td><strong>{{ item.nombre }}</strong></td><td><strong>{{ item.stockDisponibleLbs.toLocaleString('es-GT') }} lb</strong></td><td>{{ item.stockReservadoLbs.toLocaleString('es-GT') }} lb</td><td>{{ item.stockTotalLbs.toLocaleString('es-GT') }} lb</td><td>{{ item.cantidadBolsasDisponible }}</td><td>{{ item.ultimaActualizacion?.slice(0, 10) }}</td></tr> }</tbody>
        }
      </table></div> }
    </section>
  `
})
export class Catalog implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  readonly kind = this.route.snapshot.data['kind'] as CatalogKind;
  readonly title = { clientes: 'Clientes', productos: 'Productos', inventario: 'Inventario' }[this.kind];
  readonly description = { clientes: 'Directorio de clientes registrados.', productos: 'Catálogo de productos y unidades de peso.', inventario: 'Existencias disponibles y reservadas por producto.' }[this.kind];
  readonly clientes = signal<Cliente[]>([]);
  readonly productos = signal<Producto[]>([]);
  readonly inventario = signal<Inventario[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  search = '';

  count(): number {
    return this.kind === 'clientes' ? this.clientes().length : this.kind === 'productos' ? this.productos().length : this.inventario().length;
  }

  ngOnInit(): void { this.load(); }
  clear(): void { this.search = ''; this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    const request: Observable<ApiResponse<Cliente[] | Producto[] | Inventario[]>> = this.kind === 'clientes' ? this.api.clientes(this.search.trim())
      : this.kind === 'productos' ? this.api.productos(this.search.trim()) : this.api.inventario(this.search.trim());
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
}
