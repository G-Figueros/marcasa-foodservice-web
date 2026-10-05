import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { PedidoFiltro, RutaFila } from '../../core/models';

interface RouteGroup { pedidoId: number; cliente: string; codigo: string; direccion: string; telefono: string; fecha: string | null; rows: RutaFila[]; }

@Component({
  selector: 'app-route-sheet',
  imports: [FormsModule],
  template: `
    <div class="page-heading no-print"><div><p class="section-kicker">LOGÍSTICA</p><h1>Hoja de ruta</h1><p>Prepará la lista de pedidos y guardala como PDF desde la impresión del navegador.</p></div><button class="btn btn-primary" [disabled]="groups().length === 0" (click)="print()">▧ Imprimir / guardar PDF</button></div>
    <section class="surface no-print"><div class="filter-grid"><label>Buscar<input [(ngModel)]="filter.textoBusqueda" (keyup.enter)="load()" placeholder="Pedido, cliente o producto"></label><label>Desde<input type="date" [(ngModel)]="filter.fechaDesde"></label><label>Hasta<input type="date" [(ngModel)]="filter.fechaHasta"></label><button class="btn btn-primary" (click)="load()">Aplicar filtros</button><button class="btn btn-outline" (click)="clear()">Limpiar</button></div></section>
    @if (error()) { <div class="notice error no-print" role="alert">{{ error() }}</div> }
    <section class="surface route-document">
      <div class="route-title"><div><span class="section-kicker">MARCASA FOODSERVICE</span><h2>Hoja de ruta</h2></div><div class="route-meta">Generado: {{ today }}<br>{{ groups().length }} pedidos</div></div>
      @if (loading()) { <div class="empty-state">Cargando ruta…</div> }
      @else if (groups().length === 0) { <div class="empty-state"><strong>Sin pedidos para la ruta</strong><span>Los pedidos autorizados aparecerán aquí.</span></div> }
      @for (group of groups(); track group.pedidoId) {
        <article class="route-order"><header><div><strong>Pedido #{{ group.pedidoId }}</strong><span>{{ group.cliente }} · {{ group.codigo }}</span></div><span>Entrega: {{ date(group.fecha) }}</span></header>
          <div class="route-contact"><span><b>Dirección:</b> {{ group.direccion || '—' }}</span><span><b>Teléfono:</b> {{ group.telefono || '—' }}</span></div>
          <table><thead><tr><th>Producto</th><th>Tipo de peso</th><th>Libras</th><th>Bolsas</th></tr></thead><tbody>@for (row of group.rows; track row.pedidoDetalleId) { <tr><td>{{ row.producto }} <small>{{ row.codigoProducto }}</small></td><td>{{ row.tipoPesoDescripcion }}</td><td>{{ row.cantidadReservadaLbs }}</td><td>{{ row.cantidadReservadaBolsas }}</td></tr> }</tbody></table>
          <div class="signature-row"><span>Nombre de quien recibe: _____________________</span><span>Firma: _____________________</span></div>
        </article>
      }
    </section>
  `
})
export class RouteSheet implements OnInit {
  private readonly api = inject(ApiService);
  readonly groups = signal<RouteGroup[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly today = new Date().toLocaleDateString('es-GT');
  filter: PedidoFiltro = {};

  ngOnInit(): void { this.load(); }
  date(value: string | null): string { return value ? new Date(value).toLocaleDateString('es-GT') : '—'; }
  clear(): void { this.filter = {}; this.load(); }
  print(): void { window.print(); }

  load(): void {
    if (this.filter.fechaDesde && this.filter.fechaHasta && this.filter.fechaDesde > this.filter.fechaHasta) {
      this.error.set('La fecha inicial no puede ser posterior a la fecha final.'); return;
    }
    this.loading.set(true); this.error.set('');
    this.api.ruta(this.filter).subscribe({
      next: response => { this.groups.set(this.group(response.data)); this.loading.set(false); },
      error: error => { this.error.set(error.error?.message || 'No se pudo cargar la ruta.'); this.loading.set(false); }
    });
  }

  private group(rows: RutaFila[]): RouteGroup[] {
    const map = new Map<number, RouteGroup>();
    for (const row of rows) {
      let group = map.get(row.pedidoId);
      if (!group) {
        group = { pedidoId: row.pedidoId, cliente: row.nombreComercial, codigo: row.codigoCliente,
          direccion: row.direccion || '', telefono: row.telefono || '', fecha: row.fechaEntregaProgramada, rows: [] };
        map.set(row.pedidoId, group);
      }
      group.rows.push(row);
    }
    return [...map.values()];
  }
}
