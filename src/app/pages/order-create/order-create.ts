import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { Cliente, Producto } from '../../core/models';

interface DraftLine {
  productoId: number | null;
  tipoPeso: 'N' | 'B';
  libras: number | null;
  bolsas: number | null;
}

@Component({
  selector: 'app-order-create',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-heading"><div><p class="section-kicker">PEDIDOS / NUEVO</p><h1>Crear pedido</h1><p>Seleccioná un cliente y los productos. El stock se reservará al guardar.</p></div><a class="btn btn-outline" routerLink="/pedidos">← Volver</a></div>
    @if (loading()) { <div class="surface empty-state">Cargando clientes y productos…</div> }
    @else {
      <section class="surface form-section"><div class="surface-header"><div><p class="section-kicker">01 / DATOS GENERALES</p><h2>Cliente y entrega</h2></div></div>
        <div class="form-grid"><label>Cliente <span class="required">*</span><select [(ngModel)]="clienteId"><option [ngValue]="null">Seleccioná un cliente</option>@for (item of clientes(); track item.clienteId) { <option [ngValue]="item.clienteId">{{ item.codigoCliente }} · {{ item.nombreComercial }}</option> }</select></label>
          <label>Fecha de entrega programada<input type="date" [(ngModel)]="fechaEntrega"></label></div>
        <label>Observaciones<textarea rows="3" maxlength="500" [(ngModel)]="observaciones" placeholder="Indicaciones para preparar o entregar el pedido"></textarea></label>
      </section>
      <section class="surface form-section"><div class="surface-header"><div><p class="section-kicker">02 / DETALLE</p><h2>Productos solicitados</h2></div><button class="btn btn-outline" (click)="addLine()">＋ Agregar producto</button></div>
        @for (line of lines; track $index; let i = $index) {
          <div class="order-line"><div class="line-number">{{ i + 1 }}</div>
            <label class="product-select">Producto<select [(ngModel)]="line.productoId" (ngModelChange)="productChanged(line)"><option [ngValue]="null">Seleccioná un producto</option>@for (item of productos(); track item.productoId) { <option [ngValue]="item.productoId">{{ item.codigoProducto }} · {{ item.nombre }}</option> }</select></label>
            <label>Tipo de peso<select [(ngModel)]="line.tipoPeso"><option value="N" [disabled]="!supports(line, 'N')">Neto</option><option value="B" [disabled]="!supports(line, 'B')">Bruto</option></select></label>
            <label>Libras<input type="number" min="0" step="0.01" [(ngModel)]="line.libras" placeholder="0.00"></label>
            <label>Bolsas<input type="number" min="0" step="1" [(ngModel)]="line.bolsas" placeholder="0"></label>
            <button class="icon-button" [disabled]="lines.length === 1" (click)="removeLine(i)" aria-label="Quitar producto" title="Quitar">×</button>
          </div>
        }
        <p class="field-hint">Indicá libras o bolsas mayores que cero. El cálculo final de reserva lo realiza la base de datos.</p>
      </section>
      @if (error()) { <div class="notice error" role="alert">{{ error() }}</div> }
      <div class="form-actions"><a class="btn btn-outline" routerLink="/pedidos">Cancelar</a><button class="btn btn-primary" [disabled]="saving()" (click)="save()">{{ saving() ? 'Guardando…' : 'Crear pedido' }}</button></div>
    }
  `
})
export class OrderCreate implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly clientes = signal<Cliente[]>([]);
  readonly productos = signal<Producto[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  clienteId: number | null = null;
  fechaEntrega = '';
  observaciones = '';
  lines: DraftLine[] = [{ productoId: null, tipoPeso: 'N', libras: null, bolsas: null }];

  ngOnInit(): void {
    forkJoin({ clientes: this.api.clientes(), productos: this.api.productos() }).subscribe({
      next: data => { this.clientes.set(data.clientes.data); this.productos.set(data.productos.data); this.loading.set(false); },
      error: () => { this.error.set('No se pudieron cargar los catálogos.'); this.loading.set(false); }
    });
  }

  addLine(): void { this.lines.push({ productoId: null, tipoPeso: 'N', libras: null, bolsas: null }); }
  removeLine(index: number): void { this.lines.splice(index, 1); }
  supports(line: DraftLine, type: 'N' | 'B'): boolean {
    const product = this.productos().find(p => p.productoId === line.productoId);
    return !product || (type === 'N' ? product.permitePesoNeto : product.permitePesoBruto);
  }
  productChanged(line: DraftLine): void {
    if (!this.supports(line, line.tipoPeso)) line.tipoPeso = this.supports(line, 'N') ? 'N' : 'B';
  }

  save(): void {
    this.error.set('');
    if (!this.clienteId) { this.error.set('Seleccioná un cliente.'); return; }
    if (this.lines.some(line => !line.productoId || !this.supports(line, line.tipoPeso)
      || (Number(line.libras) || 0) < 0 || (Number(line.bolsas) || 0) < 0
      || ((Number(line.libras) || 0) === 0 && (Number(line.bolsas) || 0) === 0)
      || (line.bolsas !== null && !Number.isInteger(Number(line.bolsas))))) {
      this.error.set('Revisá los productos, el tipo de peso y las cantidades.'); return;
    }
    this.saving.set(true);
    this.api.crearPedido({
      clienteId: this.clienteId,
      fechaEntregaProgramada: this.fechaEntrega || null,
      observaciones: this.observaciones.trim() || null,
      detalle: this.lines.map(line => ({
        productoId: line.productoId!, tipoPeso: line.tipoPeso,
        cantidadSolicitadaLbs: line.libras || null,
        cantidadSolicitadaBolsas: line.bolsas || null
      }))
    }).subscribe({
      next: response => { this.saving.set(false); void this.router.navigate(['/pedidos', response.data.pedidoId]); },
      error: error => { this.saving.set(false); this.error.set(error.error?.message || 'No se pudo crear el pedido.'); }
    });
  }
}
