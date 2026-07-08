import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Ítems por página estándar de las tablas de la app. */
export const ITEMS_POR_PAGINA = 10;

/** Página efectiva: clampa cuando los filtros achican la lista y la página quedó fuera de rango. */
export function paginaEfectiva(totalItems: number, pagina: number, porPagina = ITEMS_POR_PAGINA): number {
  const total = Math.max(1, Math.ceil(totalItems / porPagina));
  return Math.min(Math.max(1, pagina), total);
}

/** Recorta la lista a la página pedida (clampada). */
export function paginar<T>(lista: T[], pagina: number, porPagina = ITEMS_POR_PAGINA): T[] {
  const p = paginaEfectiva(lista.length, pagina, porPagina);
  return lista.slice((p - 1) * porPagina, p * porPagina);
}

/**
 * Paginador del design system: info "desde–hasta de total" + navegación con
 * ventana compacta de páginas (1 … 4 5 6 … 12). Se oculta solo si hay una página.
 */
@Component({
  selector: 'app-paginador',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pgr" *ngIf="totalPaginas > 1">
      <span class="pgr-info">{{ desde }}–{{ hasta }} de {{ total }}</span>
      <nav class="pgr-nav" aria-label="Paginación">
        <button class="pgr-btn" [disabled]="paginaActual <= 1" (click)="ir(paginaActual - 1)" aria-label="Página anterior">
          <i class="pi pi-angle-left"></i>
        </button>
        <ng-container *ngFor="let p of ventana">
          <button *ngIf="p > 0" class="pgr-btn num" [class.sel]="p === paginaActual" (click)="ir(p)">{{ p }}</button>
          <span *ngIf="p < 0" class="pgr-dots">…</span>
        </ng-container>
        <button class="pgr-btn" [disabled]="paginaActual >= totalPaginas" (click)="ir(paginaActual + 1)" aria-label="Página siguiente">
          <i class="pi pi-angle-right"></i>
        </button>
      </nav>
    </div>
  `,
  styles: [
    `
      .pgr { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 10px; flex-wrap: wrap; }
      .pgr-info { font-size: 12px; color: #969cad; font-variant-numeric: tabular-nums; }
      .pgr-nav { display: flex; align-items: center; gap: 3px; }
      .pgr-btn {
        appearance: none; cursor: pointer; font: inherit;
        min-width: 30px; height: 30px; padding: 0 6px;
        display: inline-flex; align-items: center; justify-content: center;
        border: 1px solid #e7e8f1; background: #fff; border-radius: 7px;
        font-size: 12.5px; font-weight: 600; color: #5b6474;
      }
      .pgr-btn i { font-size: 11px; }
      .pgr-btn:hover:not(:disabled):not(.sel) { border-color: #d5d8e6; background: #fafbff; color: #1a1a2e; }
      .pgr-btn:disabled { opacity: 0.45; cursor: default; }
      .pgr-btn.num { font-variant-numeric: tabular-nums; }
      .pgr-btn.sel { background: #6366f1; border-color: #6366f1; color: #fff; cursor: default; }
      .pgr-dots { color: #969cad; font-size: 12px; padding: 0 3px; }
    `,
  ],
})
export class PaginadorComponent {
  @Input() total = 0;
  @Input() pagina = 1;
  @Input() porPagina = ITEMS_POR_PAGINA;
  @Output() paginaChange = new EventEmitter<number>();

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.total / this.porPagina));
  }
  /** Página mostrada (clampada por si los filtros achicaron la lista). */
  get paginaActual(): number {
    return paginaEfectiva(this.total, this.pagina, this.porPagina);
  }
  get desde(): number {
    return this.total === 0 ? 0 : (this.paginaActual - 1) * this.porPagina + 1;
  }
  get hasta(): number {
    return Math.min(this.total, this.paginaActual * this.porPagina);
  }
  /** Ventana compacta: 1 … p-1 p p+1 … N (negativos = puntos suspensivos). */
  get ventana(): number[] {
    const n = this.totalPaginas;
    const p = this.paginaActual;
    if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1);
    const out: number[] = [1];
    if (p > 3) out.push(-1);
    for (let i = Math.max(2, p - 1); i <= Math.min(n - 1, p + 1); i++) out.push(i);
    if (p < n - 2) out.push(-2);
    out.push(n);
    return out;
  }

  ir(p: number): void {
    if (p >= 1 && p <= this.totalPaginas && p !== this.paginaActual) this.paginaChange.emit(p);
  }
}
