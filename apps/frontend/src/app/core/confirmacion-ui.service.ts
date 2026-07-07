import { Injectable, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';

/**
 * Confirmaciones de la app con estilo unificado. Reemplaza a `window.confirm`:
 * el diálogo real es el `<p-confirmDialog>` global del shell (App), que escucha
 * la instancia única de ConfirmationService provista en app.config.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmacionUiService {
  private confirmation = inject(ConfirmationService);

  /** Confirmación destructiva estándar: "¿Eliminar X?" con botón rojo. */
  eliminar(mensaje: string, onAccept: () => void): void {
    this.confirmation.confirm({
      header: 'Confirmar eliminación',
      message: mensaje,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      defaultFocus: 'reject',
      accept: onAccept,
    });
  }
}
