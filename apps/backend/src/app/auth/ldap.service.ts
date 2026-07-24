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

  async getGroupMembers(): Promise<{ username: string; nombre: string; area: string; mail?: string }[]> {
    // 1. Mock Mode Fallback
    if (process.env.LDAP_MOCK === 'true' || !process.env.LDAP_URL) {
      this.logger.warn('LDAP Mock Mode active. Returning mock network users list.');
      return [
        { username: 'admin', nombre: 'Administrador General', area: 'Sistemas', mail: 'admin@empresa.local' },
        { username: 'ad_user', nombre: 'Administrador de Dominio', area: 'Sistemas', mail: 'ad_user@empresa.local' },
        { username: 'jdoe', nombre: 'John Doe', area: 'Informática', mail: 'jdoe@empresa.local' },
        { username: 'mrodriguez', nombre: 'Maria Rodriguez', area: 'Administración', mail: 'mrodriguez@empresa.local' },
        { username: 'glopez', nombre: 'Gonzalo Lopez', area: 'Producción', mail: 'glopez@empresa.local' }
      ];
    }

    return new Promise((resolve) => {
      try {
        const client = ldap.createClient({
          url: process.env.LDAP_URL!,
          timeout: 10000,
          connectTimeout: 10000,
        });

        client.on('error', (err) => {
          this.logger.error(`LDAP client connection error during search: ${err.message}`);
          resolve([]);
        });

        const bindDN = process.env.LDAP_BIND_DN || '';
        const bindPassword = process.env.LDAP_BIND_PASSWORD || '';
        const groupDN = process.env.LDAP_GROUP_DN;
        const filter = groupDN ? `(&(objectClass=user)(memberOf=${groupDN}))` : `(&(objectClass=user)(sAMAccountName=*))`;
        
        const performSearch = () => {
          const searchBase = process.env.LDAP_SEARCH_BASE || 'CN=Users,DC=empresa,DC=local';
          const opts = {
            filter: filter,
            scope: 'sub' as const,
            attributes: ['sAMAccountName', 'displayName', 'department', 'mail', 'cn']
          };

          client.search(searchBase, opts, (err: any, res: any) => {
            if (err) {
              this.logger.error(`LDAP search failed: ${err.message}`);
              client.destroy();
              resolve([]);
              return;
            }

            const users: any[] = [];

            res.on('searchEntry', (entry: any) => {
              const user = entry.object;
              // Extract AD fields (sometimes attributes are arrays or empty)
              const username = user.sAMAccountName;
              const nombre = user.displayName || user.cn || username;
              const area = user.department || 'Sin Área';
              const mail = user.mail || '';

              if (username) {
                users.push({ username, nombre, area, mail });
              }
            });

            res.on('error', (err: any) => {
              this.logger.error(`LDAP search result error: ${err.message}`);
              client.destroy();
              resolve([]);
            });

            res.on('end', () => {
              client.destroy();
              resolve(users);
            });
          });
        };

        if (bindDN && bindPassword) {
          client.bind(bindDN, bindPassword, (err) => {
            if (err) {
              this.logger.error(`LDAP bind failed for search operations: ${err.message}`);
              client.destroy();
              resolve([]);
            } else {
              performSearch();
            }
          });
        } else {
          performSearch();
        }
      } catch (err: any) {
        this.logger.error(`LDAP search exception: ${err.message}`);
        resolve([]);
      }
    });
  }
}
