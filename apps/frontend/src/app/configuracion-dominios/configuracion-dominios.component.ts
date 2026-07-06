import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import {
  CatalogosService,
  Dominio,
  TipoAgrupador,
  AtributoDefinicion,
} from '../core/services/catalogos.service';
import { DOMINIO_ICONOS, DOMINIO_COLORES } from '@inventory-system/api-contract';

@Component({
  selector: 'app-configuracion-dominios',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, SelectModule],
  templateUrl: './configuracion-dominios.component.html',
  styleUrl: './configuracion-dominios.component.scss',
})
export class ConfiguracionDominiosComponent implements OnInit {
  dominios: Dominio[] = [];
  selectedId: number | null = null;
  tiposByDom: Record<number, TipoAgrupador[]> = {};
  atrsByDom: Record<number, AtributoDefinicion[]> = {};
  activeTab: 'tipos' | 'atributos' = 'tipos';

  // Diálogos
  showDominioDialog = false;
  editingDominioId: number | null = null;
  dominioForm = { nombre: '', icono: 'box', color: 'indigo' };

  readonly iconos = DOMINIO_ICONOS;
  readonly colores = DOMINIO_COLORES;

  showTipoDialog = false;
  editingTipoId: number | null = null;
  tipoForm = { nombre: '', asignable: true };

  showAtributoDialog = false;
  editingAtributoId: number | null = null;
  atributoForm = { nombre: '', clave: '', tipoDato: 'TEXTO' };

  readonly asignableOptions = [
    { label: 'Asignable a persona', value: true },
    { label: 'Contenedor / ubicación', value: false },
  ];
  readonly tipoDatoOptions = [
    { label: 'Texto', value: 'TEXTO' },
    { label: 'Número', value: 'NUMERO' },
    { label: 'Fecha', value: 'FECHA' },
    { label: 'Booleano', value: 'BOOLEANO' },
    { label: 'Lista', value: 'LISTA' },
  ];

  constructor(private catalogos: CatalogosService) {}

  ngOnInit(): void {
    this.loadAll();
  }

  get selected(): Dominio | null {
    return this.dominios.find((d) => d.id === this.selectedId) ?? null;
  }
  get tipos(): TipoAgrupador[] {
    return this.selectedId ? this.tiposByDom[this.selectedId] ?? [] : [];
  }
  get atributos(): AtributoDefinicion[] {
    return this.selectedId ? this.atrsByDom[this.selectedId] ?? [] : [];
  }
  countTipos(d: Dominio): number {
    return d.id ? this.tiposByDom[d.id]?.length ?? 0 : 0;
  }
  countAtrs(d: Dominio): number {
    return d.id ? this.atrsByDom[d.id]?.length ?? 0 : 0;
  }
  tipoDatoLabel(v: string): string {
    return this.tipoDatoOptions.find((o) => o.value === v)?.label ?? v;
  }

  loadAll(): void {
    this.catalogos.getDominios().subscribe((res) => {
      if (!res.success) return;
      this.dominios = res.data;
      if (this.selectedId == null && this.dominios.length) {
        this.selectedId = this.dominios[0].id ?? null;
      }
      this.dominios.forEach((d) => {
        if (d.id) this.loadDominioConfig(d.id);
      });
    });
  }

  loadDominioConfig(id: number): void {
    this.catalogos.getTiposAgrupador(id).subscribe((r) => {
      if (r.success) this.tiposByDom = { ...this.tiposByDom, [id]: r.data };
    });
    this.catalogos.getAtributos(id).subscribe((r) => {
      if (r.success) this.atrsByDom = { ...this.atrsByDom, [id]: r.data };
    });
  }

  select(d: Dominio): void {
    this.selectedId = d.id ?? null;
    this.activeTab = 'tipos';
  }

  // ---- Dominio ----
  openNewDominio(): void {
    this.editingDominioId = null;
    this.dominioForm = { nombre: '', icono: 'box', color: 'indigo' };
    this.showDominioDialog = true;
  }
  openEditDominio(d: Dominio, ev?: Event): void {
    ev?.stopPropagation();
    this.editingDominioId = d.id ?? null;
    this.dominioForm = { nombre: d.nombre, icono: d.icono || 'box', color: d.color || 'indigo' };
    this.showDominioDialog = true;
  }
  saveDominio(): void {
    const nombre = this.dominioForm.nombre.trim();
    if (!nombre) return;
    const data = { nombre, icono: this.dominioForm.icono, color: this.dominioForm.color };
    const done = () => {
      this.showDominioDialog = false;
      this.loadAll();
    };
    if (this.editingDominioId) {
      this.catalogos.updateDominio(this.editingDominioId, data).subscribe(done);
    } else {
      this.catalogos.createDominio(data).subscribe(done);
    }
  }
  deleteDominio(d: Dominio, ev?: Event): void {
    ev?.stopPropagation();
    if (!d.id) return;
    if (!confirm(`¿Eliminar el dominio "${d.nombre}"?`)) return;
    this.catalogos.deleteDominio(d.id).subscribe({
      next: () => {
        if (this.selectedId === d.id) this.selectedId = null;
        this.loadAll();
      },
      error: (e) => alert(e?.error?.message || 'No se pudo eliminar el dominio.'),
    });
  }

  // ---- Tipo de agrupador ----
  openNewTipo(): void {
    this.editingTipoId = null;
    this.tipoForm = { nombre: '', asignable: true };
    this.showTipoDialog = true;
  }
  openEditTipo(t: TipoAgrupador): void {
    this.editingTipoId = t.id ?? null;
    this.tipoForm = { nombre: t.nombre, asignable: t.asignable ?? true };
    this.showTipoDialog = true;
  }
  saveTipo(): void {
    const nombre = this.tipoForm.nombre.trim();
    if (!nombre || !this.selectedId) return;
    const domId = this.selectedId;
    const done = () => {
      this.showTipoDialog = false;
      this.loadDominioConfig(domId);
    };
    if (this.editingTipoId) {
      this.catalogos
        .updateTipoAgrupador(this.editingTipoId, { nombre, asignable: this.tipoForm.asignable })
        .subscribe(done);
    } else {
      this.catalogos
        .createTipoAgrupador(domId, { nombre, asignable: this.tipoForm.asignable })
        .subscribe(done);
    }
  }
  deleteTipo(t: TipoAgrupador): void {
    if (!t.id || !this.selectedId) return;
    if (!confirm(`¿Eliminar el tipo "${t.nombre}"?`)) return;
    const domId = this.selectedId;
    this.catalogos.deleteTipoAgrupador(t.id).subscribe({
      next: () => this.loadDominioConfig(domId),
      error: (e) => alert(e?.error?.message || 'No se pudo eliminar el tipo.'),
    });
  }

  // ---- Atributo ----
  openNewAtributo(): void {
    this.editingAtributoId = null;
    this.atributoForm = { nombre: '', clave: '', tipoDato: 'TEXTO' };
    this.showAtributoDialog = true;
  }
  openEditAtributo(a: AtributoDefinicion): void {
    this.editingAtributoId = a.id ?? null;
    this.atributoForm = { nombre: a.nombre, clave: a.clave, tipoDato: a.tipoDato };
    this.showAtributoDialog = true;
  }
  saveAtributo(): void {
    const nombre = this.atributoForm.nombre.trim();
    const clave = this.atributoForm.clave.trim();
    if (!nombre || !clave || !this.selectedId) return;
    const domId = this.selectedId;
    const data = { nombre, clave, tipoDato: this.atributoForm.tipoDato };
    const done = () => {
      this.showAtributoDialog = false;
      this.loadDominioConfig(domId);
    };
    if (this.editingAtributoId) {
      this.catalogos.updateAtributo(this.editingAtributoId, data).subscribe(done);
    } else {
      this.catalogos.createAtributo(domId, data).subscribe(done);
    }
  }
  deleteAtributo(a: AtributoDefinicion): void {
    if (!a.id || !this.selectedId) return;
    if (!confirm(`¿Eliminar el atributo "${a.nombre}"?`)) return;
    const domId = this.selectedId;
    this.catalogos.deleteAtributo(a.id).subscribe(() => this.loadDominioConfig(domId));
  }
}
