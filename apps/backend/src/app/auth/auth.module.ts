import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AdministradoresController } from './administradores.controller';
import { AuthService } from './auth.service';
import { LdapService } from './ldap.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super_secret_key_de_firmas',
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [AuthController, AdministradoresController],
  providers: [AuthService, LdapService, JwtStrategy],
  exports: [AuthService, LdapService, PassportModule, JwtModule],
})
export class AuthModule {}
