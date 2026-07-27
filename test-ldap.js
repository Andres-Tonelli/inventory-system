require('dotenv').config();
const ldap = require('ldapjs');

const ldapUrl = process.env.LDAP_URL;
const bindDN = process.env.LDAP_BIND_DN;
const bindPassword = process.env.LDAP_BIND_PASSWORD;
const searchBase = process.env.LDAP_SEARCH_BASE || 'CN=Users,DC=empresa,DC=local';
const groupDN = process.env.LDAP_GROUP_DN;

console.log('=== TEST DE CONEXIÓN LDAP ===');
console.log(`- URL del Servidor: ${ldapUrl}`);
console.log(`- Bind DN (Cuenta): ${bindDN}`);
console.log(`- Base de Búsqueda: ${searchBase}`);
console.log(`- Grupo de Empleados: ${groupDN}\n`);

if (!ldapUrl) {
  console.error('Error: LDAP_URL no está definida en el archivo .env');
  process.exit(1);
}

console.log('1. Intentando conectar al servidor LDAP...');
const client = ldap.createClient({
  url: ldapUrl,
  timeout: 5000,
  connectTimeout: 5000,
});

client.on('error', (err) => {
  console.error('\n[ERROR DE CONEXIÓN] No se pudo establecer contacto con el servidor:');
  console.error(err.message);
  process.exit(1);
});

console.log('2. Conectado. Intentando autenticar (Bind DN)...');
client.bind(bindDN, bindPassword, (err) => {
  if (err) {
    console.error('\n[ERROR DE AUTENTICACIÓN] Las credenciales de Bind DN son incorrectas o no tienen acceso:');
    console.error(err.message);
    client.destroy();
    process.exit(1);
  }

  console.log('¡Autenticación exitosa! Acceso concedido al directorio.\n');
  console.log('3. Realizando búsqueda de usuarios...');

  const filter = groupDN ? `(&(objectCategory=person)(objectClass=user)(memberOf=${groupDN}))` : `(&(objectClass=user)(sAMAccountName=*))`;
  console.log(`- Filtro utilizado: ${filter}`);

  const opts = {
    filter: filter,
    scope: 'sub',
    attributes: ['sAMAccountName', 'displayName', 'department', 'mail', 'cn']
  };

  client.search(searchBase, opts, (err, res) => {
    if (err) {
      console.error('\n[ERROR DE BÚSQUEDA] Falló la consulta LDAP:');
      console.error(err.message);
      client.destroy();
      process.exit(1);
    }

    let count = 0;

res.on('searchEntry', (entry) => {
      count++;
      
      // 1. Creamos un objeto vacío
      const user = {};

      // 2. Extraemos los atributos de la forma correcta para ldapjs moderno
      if (entry.attributes) {
        entry.attributes.forEach(attr => {
          // Guardamos el tipo de atributo (ej. 'mail') y su valor
          // Si tiene un solo valor lo guardamos como texto, si tiene varios como array
          user[attr.type] = attr.values.length === 1 ? attr.values[0] : attr.values;
        });
      }

      // 3. Revisión cruda del objeto que acabamos de armar
      console.log(`\n=== [Usuario #${count}] REVISIÓN CRUDA ===`);
      console.log(user); 
      console.log('-----------------------------------------');

      // 4. Asignamos variables atajando posibles mayúsculas/minúsculas
      const username = user.sAMAccountName || user.samaccountname || 'Sin Username';
      const fullname = user.displayName || user.displayname || user.cn || 'Sin Nombre';
      const area = user.department || user.Department || 'No especificada';
      const email = user.mail || user.Mail || 'No especificado';

      console.log(`- Username: ${username}`);
      console.log(`- Nombre Completo: ${fullname}`);
      console.log(`- Área: ${area}`);
      console.log(`- Email: ${email}`);
    });

    res.on('error', (err) => {
      console.error('\n[ERROR DURANTE LA BÚSQUEDA] Error en el flujo de resultados:');
      console.error(err.message);
      client.destroy();
      process.exit(1);
    });

    res.on('end', (result) => {
      console.log(`\n=== Búsqueda finalizada. Total de usuarios encontrados: ${count} ===`);
      client.destroy();
    });
  });
});
