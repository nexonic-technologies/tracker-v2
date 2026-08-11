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

const feedSidebars = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("=====Connected to DB======");

        // Clear all current sidebar items from the collection
        const deleteResult = await mongoose.connection.db.collection('sidebars').deleteMany({});
        console.log(`Cleared ${deleteResult.deletedCount} existing sidebar documents from DB.`);

        // Read sidebar-parent.json and sidebar-childern.json
        const parentPath = path.resolve(__dirname, 'sidebar-parent.json');
        const childrenPath = path.resolve(__dirname, 'sidebar-childern.json');

        const parentData = fs.existsSync(parentPath) ? JSON.parse(fs.readFileSync(parentPath, 'utf8')) : [];
        const childrenData = fs.existsSync(childrenPath) ? JSON.parse(fs.readFileSync(childrenPath, 'utf8')) : [];

        const allSidebarItems = [...parentData, ...childrenData];

        if (allSidebarItems.length === 0) {
            console.log("No sidebar items found to insert.");
            return;
        }

        // Prepare documents with proper ObjectIds and dates
        const preparedData = allSidebarItems.map(item => ({
            ...item,
            ...(item._id ? { _id: new mongoose.Types.ObjectId(item._id) } : {}),
            capabilities: item.capabilities ? item.capabilities.map(id => new mongoose.Types.ObjectId(id)) : [],
            parentId: item.parentId ? new mongoose.Types.ObjectId(item.parentId) : null,
            isActive: item.isActive !== undefined ? item.isActive : true,
            isDeleted: item.isDeleted !== undefined ? item.isDeleted : false,
            createdAt: new Date(),
            updatedAt: new Date()
        }));

        // Insert new sidebar documents
        const insertResult = await mongoose.connection.db.collection('sidebars').insertMany(preparedData);
        console.log(`Successfully fed ${insertResult.insertedCount} total sidebar items (parents + children) into DB.`);

        // Extract updated sidebars from DB and store into feed-sidebars.json
        const updatedSidebars = await mongoose.connection.db.collection('sidebars').find({}).toArray();
        const exportPath = path.resolve(__dirname, 'feed-sidebars.json');
        fs.writeFileSync(exportPath, JSON.stringify(updatedSidebars, null, 2));
        console.log(`Extracted and stored ${updatedSidebars.length} sidebar documents into ${exportPath}`);

    } catch (error) {
        console.log("=====Error feeding sidebars to DB======");
        console.log(error);
    } finally {
        await mongoose.disconnect();
        console.log("=====Disconnected from DB======");
    }
};

feedSidebars();
