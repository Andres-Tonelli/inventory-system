import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LdapService } from './ldap.service';
import { PrismaService } from '@inventory-system/backend-persistence';

@Injectable()
export class AuthService {
  constructor(
    private readonly ldapService: LdapService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async login(username: string, password: string) {
    const normalizedUsername = username.toLowerCase().trim();

    // 1. Authenticate against Zentyal LDAP
    const isValid = await this.ldapService.authenticate(normalizedUsername, password);
    if (!isValid) {
      throw new UnauthorizedException('Credenciales inválidas en Active Directory');
    }

    // 2. Fetch admin user from Database
    const admin = await this.prisma.administrador.findUnique({
      where: { username: normalizedUsername },
      include: {
        dominios: {
          select: { dominioId: true }
        }
      }
    });

    if (!admin) {
      throw new UnauthorizedException('El usuario de red no está registrado como administrador en TagSA-Inv');
    }

    // 3. Extract allowed domains
    const allowedDomains = admin.dominios.map((d) => d.dominioId);

    // 4. Generate JWT payload
    const payload = {
      sub: admin.id,
      username: admin.username,
      nombre: admin.nombre,
      rol: admin.rol,
      dominios: allowedDomains
    };

    return {
      success: true,
      data: {
        token: this.jwtService.sign(payload),
        user: {
          id: admin.id,
          username: admin.username,
          nombre: admin.nombre,
          rol: admin.rol,
          dominios: allowedDomains
        }
      }
    };
  }
}
