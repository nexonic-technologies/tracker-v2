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

const feedCapabilities = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("=====Connected to DB======");

        // Clear all current capabilities from the collection
        const deleteResult = await mongoose.connection.db.collection('capabilities').deleteMany({});
        console.log(`Cleared ${deleteResult.deletedCount} existing capabilities from DB.`);

        // Read capablities-updated.json
        const jsonPath = path.resolve(__dirname, 'capablities-updated.json');
        const capabilitiesData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

        if (!Array.isArray(capabilitiesData) || capabilitiesData.length === 0) {
            console.log("No capability items found in capablities-updated.json to insert.");
            return;
        }

        // Insert new capabilities
        const insertResult = await mongoose.connection.db.collection('capabilities').insertMany(capabilitiesData);
        console.log(`Successfully fed ${insertResult.insertedCount} capabilities from capablities-updated.json into DB.`);

        // Extract updated capabilities from DB and store into feed-capablities.json
        const updatedCapabilities = await mongoose.connection.db.collection('capabilities').find({}).toArray();
        const exportPath = path.resolve(__dirname, 'feed-capablities.json');
        fs.writeFileSync(exportPath, JSON.stringify(updatedCapabilities, null, 2));
        console.log(`Extracted and stored ${updatedCapabilities.length} capabilities into ${exportPath}`);
    } catch (error) {
        console.log("=====Error feeding capabilities to DB======");
        console.log(error);
    } finally {
        await mongoose.disconnect();
        console.log("=====Disconnected from DB======");
    }
};

feedCapabilities();
