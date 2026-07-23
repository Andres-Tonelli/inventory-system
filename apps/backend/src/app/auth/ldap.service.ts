import { Injectable, Logger } from '@nestjs/common';
import * as ldap from 'ldapjs';

@Injectable()
export class LdapService {
  private readonly logger = new Logger(LdapService.name);

  async authenticate(username: string, password: string): Promise<boolean> {
    // LDAP Mock Mode for offline testing/development
    if (process.env.LDAP_MOCK === 'true' || !process.env.LDAP_URL) {
      this.logger.warn(`LDAP Mock Mode active. Validating login for ${username} against mock rules.`);
      // Mock rules: allow admin/ad_user/test with their own name as password or typical tests
      return password === 'admin' || password === 'test' || password === username || password === 'ad_user';
    }

    return new Promise((resolve) => {
      try {
        const client = ldap.createClient({
          url: process.env.LDAP_URL!,
          timeout: 5000,
          connectTimeout: 5000,
        });

        client.on('error', (err) => {
          this.logger.error(`LDAP client connection error: ${err.message}`);
          resolve(false);
        });

        // AD/LDAP Bind DN: username@domain (Zentyal Samba4 AD compatible)
        const domainSuffix = process.env.LDAP_DOMAIN_SUFFIX || '@empresa.local';
        const bindDN = username.includes('@') ? username : `${username}${domainSuffix}`;

        client.bind(bindDN, password, (err) => {
          client.destroy();
          if (err) {
            this.logger.warn(`LDAP auth failed for ${username}: ${err.message}`);
            resolve(false);
          } else {
            this.logger.log(`LDAP auth successful for ${username}`);
            resolve(true);
          }
        });
      } catch (err: any) {
        this.logger.error(`LDAP exception: ${err.message}`);
        resolve(false);
      }
    });
  }
}
