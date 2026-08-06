const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

(async () => {
  const screenshotsDir = path.join(__dirname, 'docs', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // Parse credentials from .env
  let username = 'atonelli';
  let password = 'atonelli';
  try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      
      const mockMatch = envContent.match(/LDAP_MOCK\s*=\s*(.*)/);
      const isMock = mockMatch ? mockMatch[1].trim() === 'true' : false;

      if (!isMock) {
        const dnMatch = envContent.match(/LDAP_BIND_DN\s*=\s*([^@\s\r\n]+)/);
        if (dnMatch) username = dnMatch[1].trim();

        const passMatch = envContent.match(/LDAP_BIND_PASSWORD\s*=\s*(.*)/);
        if (passMatch) password = passMatch[1].trim();
        
        console.log(`Parsed real Active Directory credentials: username=${username}`);
      } else {
        console.log('LDAP Mock is active. Using default test credentials.');
      }
    }
  } catch (err) {
    console.error('Failed to parse .env file:', err.message);
  }

  // Ensure a pending request exists so that the admin "Resolver" button is visible
  try {
    const pending = await prisma.solicitud.findFirst({ where: { estado: 'PENDIENTE' } });
    if (!pending) {
      console.log('No pending requests found. Seeding a mock pending request for screenshots...');
      const emp = await prisma.empleado.findFirst({ where: { legajo: username } });
      const dom = await prisma.dominioInventario.findFirst();
      if (emp && dom) {
        await prisma.solicitud.create({
          data: {
            tipo: 'ROTURA',
            estado: 'PENDIENTE',
            empleadoId: emp.id,
            dominioId: dom.id,
            motivo: 'Pantalla con líneas horizontales tras golpe'
          }
        });
        console.log('Successfully seeded a pending request.');
      }
    }
  } catch (err) {
    console.error('Failed to ensure pending request via Prisma:', err.message);
  } finally {
    await prisma.$disconnect();
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 850 }
  });
  const page = await context.newPage();

  try {
    console.log('Navigating to http://localhost:4200/ ...');
    await page.goto('http://localhost:4200/');
    await page.waitForTimeout(2000);

    // 1. Capture login page
    console.log('Capturing login.png...');
    await page.screenshot({ path: path.join(screenshotsDir, 'login.png') });

    // 2. Perform login
    console.log(`Logging in as ${username}...`);
    await page.fill('#username', username);
    await page.fill('#password', password);
    await page.click('button.p-button, button:has-text("Ingresar")');
    await page.waitForTimeout(5000);
    console.log('URL after login attempt:', page.url());

    // Print error if login failed
    const errorLoc = page.locator('p-message');
    if (await errorLoc.count() > 0) {
      const errorMsg = await errorLoc.innerText();
      console.error('Login page error message:', errorMsg);
    }

    // 3. Go to collaborator dashboard
    console.log('Navigating to mis-asignaciones...');
    await page.goto('http://localhost:4200/mis-asignaciones');
    await page.waitForTimeout(5000);
    console.log('URL at mis-asignaciones:', page.url());
    console.log('Capturing dashboard_colaborador.png...');
    await page.screenshot({ path: path.join(screenshotsDir, 'dashboard_colaborador.png') });

    // 4. Click to expand returned history
    console.log('Expanding history...');
    const historyHeader = page.locator('.collapsible-header').first();
    if (await historyHeader.count() > 0) {
      await historyHeader.click();
      await page.waitForTimeout(1000);
    }
    console.log('Capturing historial_devoluciones.png...');
    await page.screenshot({ path: path.join(screenshotsDir, 'historial_devoluciones.png') });

    // 5. Open general request modal
    console.log('Opening general support modal...');
    const supportBtn = page.locator('button.btn.primary').first();
    if (await supportBtn.count() > 0) {
      await supportBtn.click();
      await page.waitForTimeout(1000);
      console.log('Capturing soporte_general.png...');
      await page.screenshot({ path: path.join(screenshotsDir, 'soporte_general.png') });
      // Close the modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }

    // 7. Navigate to admin solicitudes view
    console.log('Navigating to admin solicitudes...');
    await page.goto('http://localhost:4200/solicitudes');
    await page.waitForTimeout(5000);
    console.log('URL at solicitudes:', page.url());

    // Capture admin navigation/dashboard
    console.log('Capturing admin_navigation.png & admin_dashboard.png...');
    await page.screenshot({ path: path.join(screenshotsDir, 'admin_navigation.png') });
    await page.screenshot({ path: path.join(screenshotsDir, 'admin_dashboard.png') });

    // 8. Open resolver modal
    console.log('Opening resolver modal...');
    const resolverBtn = page.locator('button.btn.btn-action-approve').first();
    if (await resolverBtn.count() > 0) {
      await resolverBtn.click();
      await page.waitForTimeout(1000);
      console.log('Capturing admin_resolver.png...');
      await page.screenshot({ path: path.join(screenshotsDir, 'admin_resolver.png') });
    } else {
      console.warn('Could not locate an approve action button in the admin table.');
    }
  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    await browser.close();
    console.log('Screenshots capture complete!');
  }
})();
