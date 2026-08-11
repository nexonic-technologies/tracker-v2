import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

import dns from 'dns';
dns.setServers(["8.8.8.8", "4.4.4.4"]);

const requireBackend = createRequire(path.resolve(ROOT_DIR, 'Backend/package.json'));
const mongoose = requireBackend('mongoose').default || requireBackend('mongoose');
const dotenv = requireBackend('dotenv');

dotenv.config({ path: path.resolve(ROOT_DIR, 'Backend/.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tracker';

async function testContext() {
  await mongoose.connect(MONGO_URI);
  
  const { setCache } = await import('../../Backend/src/utils/cache.js');
  await import('../../Backend/src/models/Department.js');
  await import('../../Backend/src/models/Designation.js');
  await setCache();

  const { buildUserContext } = await import('../../Backend/src/utils/contextBuilder.js');
  const Role = (await import('../../Backend/src/models/Role.js')).default;
  const Employee = (await import('../../Backend/src/models/Employee.js')).default;

  const superRole = await Role.findOne({ $or: [{ isSuperAdmin: true }, { name: 'Super Admin' }] }).lean();
  const emp = await Employee.findOne({ 'professionalInfo.role': superRole._id }).lean();

  if (emp && superRole) {
    const context = await buildUserContext(emp._id, superRole._id);
    console.log('SuperAdmin User:', context.user.name);
    console.log('SuperAdmin isSuperAdmin:', context.user.role.isSuperAdmin);
    console.log('Capabilities returned count:', context.capabilities.length);
    console.log('Navigation top-level items count:', context.navigation.length);
    console.log('Navigation items:', context.navigation.map(n => n.title));
  } else {
    console.log('No SuperAdmin found.');
  }

  await mongoose.disconnect();
}

testContext();
