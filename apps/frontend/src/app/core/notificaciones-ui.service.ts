import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

/**
 * Notificaciones de la app (reemplaza a `window.alert`). El render lo hace el
 * `<p-toast>` global del shell (App): los mensajes se APILAN sin superponerse
 * y expiran solos según su severidad (los errores duran más que los éxitos).
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesUiService {
  private messages = inject(MessageService);

  error(detalle: string, resumen = 'Ocurrió un problema'): void {
    this.messages.add({ severity: 'error', summary: resumen, detail: detalle, life: 6000 });
  }

  advertencia(detalle: string, resumen = 'Atención'): void {
    this.messages.add({ severity: 'warn', summary: resumen, detail: detalle, life: 5000 });
  }

  exito(detalle: string, resumen = 'Listo'): void {
    this.messages.add({ severity: 'success', summary: resumen, detail: detalle, life: 3500 });
  }

  info(detalle: string, resumen = 'Información'): void {
    this.messages.add({ severity: 'info', summary: resumen, detail: detalle, life: 4000 });
  }

  /**
   * Toast de error a partir de una respuesta HTTP del backend.
   * Si la respuesta contiene un error estructurado del backend con código de error
   * y correlationId, formatea un mensaje detallado para reportar al programador.
   */
  errorHttp(err: unknown, fallback: string): void {
    const res = (err as any)?.error;
    if (res && res.correlationId) {
      const m = res.message;
      const msgStr = Array.isArray(m) ? m.join(' · ') : m;
      const detail = `${msgStr} [Cod: ${res.errorCode} | ID: ${res.correlationId} | ${res.method} ${res.path}]`;
      this.error(detail, 'Error del Sistema');
    } else {
      const m = res?.message;
      const detalle = Array.isArray(m) ? m.join(' · ') : m || fallback;
      this.error(detalle);
    }
  }
}
