import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class DomainAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;

    // System administrators bypass domain checks
    if (user.rol === 'SISTEMA') return true;

    let dominioId: number | undefined;

    // Detect dominioId from route params, query string, or body payload
    if (request.params?.dominioId) {
      dominioId = Number(request.params.dominioId);
    } else if (request.params?.id && (request.url.includes('/dominios/') || request.url.includes('/catalogos/dominios/'))) {
      dominioId = Number(request.params.id);
    } else if (request.query?.dominioId) {
      dominioId = Number(request.query.dominioId);
    } else if (request.body?.dominioId) {
      dominioId = Number(request.body.dominioId);
    }

    if (dominioId === undefined || isNaN(dominioId)) {
      return true;
    }

    return user.dominios && user.dominios.includes(dominioId);
  }
}
