import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import fs from 'fs';
import dns from 'dns';

dns.setServers(["8.8.8.8", "4.4.4.4"]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

const requireBackend = createRequire(path.resolve(ROOT_DIR, 'Backend/package.json'));
const mongoose = requireBackend('mongoose').default || requireBackend('mongoose');
const dotenv = requireBackend('dotenv');

dotenv.config({ path: path.resolve(ROOT_DIR, 'Backend/.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tracker';

const fetchSidebarList = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("=====Connected to DB======");
        const sidebar = await mongoose.connection.db.collection('sidebars').find({}).toArray();

        const outputPath = path.resolve(__dirname, 'sidebar.json');
        fs.writeFileSync(outputPath, JSON.stringify(sidebar, null, 2));

        console.log("======Sidebar List Exported======");
        console.log(`Exported ${sidebar.length} items to ${outputPath}`);
    } catch (error) {
        console.log("=====Error connecting to DB======");
        console.log(error);
    } finally {
        await mongoose.disconnect();
        console.log("=====Disconnected from DB======");
    }
};

const fetchCapablities = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("=====Connected to DB======");
        const capabilities = await mongoose.connection.db.collection('capabilities').find({}).toArray();

        const outputPath = path.resolve(__dirname, 'capabilities.json');
        fs.writeFileSync(outputPath, JSON.stringify(capabilities, null, 2));

        console.log("======Capabilities List Exported======");
        console.log(`Exported ${capabilities.length} items to ${outputPath}`);
    } catch (error) {
        console.log("=====Error connecting to DB======");
        console.log(error);
    } finally {
        await mongoose.disconnect();
        console.log("=====Disconnected from DB======");
    }
}

// fetchSidebarList();
fetchCapablities();