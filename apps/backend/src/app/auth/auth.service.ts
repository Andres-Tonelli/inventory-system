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

    // 3. Find or create corresponding Empleado record
    let empleado = await this.prisma.empleado.findUnique({
      where: { legajo: normalizedUsername },
    });

    if (!empleado) {
      let nombre = normalizedUsername;
      let matchedAreaId = 1; // Fallback area
      try {
        const adMembers = await this.ldapService.getGroupMembers();
        const member = adMembers.find((m) => m.username.toLowerCase() === normalizedUsername);
        if (member) {
          nombre = member.nombre;
          if (member.area) {
            const areaObj = await this.prisma.area.upsert({
              where: { nombre: member.area },
              update: {},
              create: { nombre: member.area }
            });
            matchedAreaId = areaObj.id;
          }
        }
      } catch (err: any) {
        // Log error but continue
      }

      // Ensure fallback area exists if not found in db
      try {
        const areaExists = await this.prisma.area.findUnique({ where: { id: matchedAreaId } });
        if (!areaExists) {
          const defaultArea = await this.prisma.area.upsert({
            where: { nombre: 'Administración' },
            update: {},
            create: { nombre: 'Administración' }
          });
          matchedAreaId = defaultArea.id;
        }
      } catch (err) {
        // Fallback catch
      }

      empleado = await this.prisma.empleado.create({
        data: {
          legajo: normalizedUsername,
          nombre,
          areaId: matchedAreaId
        }
      });
    }

    // 4. Extract allowed domains
    const allowedDomains = admin ? admin.dominios.map((d) => d.dominioId) : [];

    // 5. Generate JWT payload
    const payload = {
      sub: admin ? admin.id : -empleado.id,
      username: normalizedUsername,
      nombre: admin ? admin.nombre : empleado.nombre,
      rol: admin ? admin.rol : 'COLABORADOR',
      dominios: allowedDomains,
      empleadoId: empleado.id
    };

    return {
      success: true,
      data: {
        token: this.jwtService.sign(payload),
        user: {
          id: admin ? admin.id : -empleado.id,
          username: normalizedUsername,
          nombre: admin ? admin.nombre : empleado.nombre,
          rol: admin ? admin.rol : 'COLABORADOR',
          dominios: allowedDomains,
          empleadoId: empleado.id
        }
      }
    };
  }
}
