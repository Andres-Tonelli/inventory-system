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

  /** Confirmación genérica NO destructiva (ej. registrar una devolución): botón primario. */
  confirmar(mensaje: string, onAccept: () => void, opciones?: { header?: string; acceptLabel?: string }): void {
    this.confirmation.confirm({
      header: opciones?.header ?? 'Confirmar',
      message: mensaje,
      icon: 'pi pi-question-circle',
      acceptLabel: opciones?.acceptLabel ?? 'Confirmar',
      rejectLabel: 'Cancelar',
      rejectButtonStyleClass: 'p-button-text',
      accept: onAccept,
    });
  }
}
