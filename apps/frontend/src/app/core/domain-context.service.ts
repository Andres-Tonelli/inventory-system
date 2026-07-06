import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DomainContextService {
  // Almacenamos el ID del dominio actualmente seleccionado
  readonly currentDomainId = signal<number | null>(null);

  constructor() {
    const saved = localStorage.getItem('selectedDomainId');
    if (saved) {
      this.currentDomainId.set(Number(saved));
    }
  }

  setDomain(id: number) {
    this.currentDomainId.set(id);
    localStorage.setItem('selectedDomainId', String(id));
  }

  clearDomain() {
    this.currentDomainId.set(null);
    localStorage.removeItem('selectedDomainId');
  }

  get domainId(): number | null {
    return this.currentDomainId();
  }
}
