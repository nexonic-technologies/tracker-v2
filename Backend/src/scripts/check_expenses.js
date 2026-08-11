import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tracker';

async function list() {
  await mongoose.connect(MONGODB_URI);
  try {
    const { default: models } = await import('../models/Collection.js');
    const count = await models.expenses.countDocuments({});
    console.log('Total expenses count:', count);
    const sample = await models.expenses.find({}).limit(5).lean();
    console.log('Sample expenses:', JSON.stringify(sample, null, 2));

    const users = await models.employees.find({}).select('basicInfo.firstName basicInfo.lastName authInfo.workEmail professionalInfo.role').populate('professionalInfo.role').lean();
    console.log('All Users:', JSON.stringify(users, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}
list();
