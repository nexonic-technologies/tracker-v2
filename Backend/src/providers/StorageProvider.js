import fs from 'fs';
import path from 'path';

class LocalStorageProvider {
  async uploadFile(targetPath, fileBuffer) {
    const fullPath = path.resolve(targetPath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, fileBuffer);
    return targetPath;
  }

  async getFile(targetPath) {
    const fullPath = path.resolve(targetPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${targetPath}`);
    }
    return fs.readFileSync(fullPath);
  }

  async deleteFile(targetPath) {
    const fullPath = path.resolve(targetPath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    return true;
  }
}

class StorageProviderFacade {
  constructor() {
    this.providers = {
      local: new LocalStorageProvider()
    };
  }

  getProvider() {
    // In V1, default is local. In future, fetch from general_settings config
    return this.providers.local;
  }

  async uploadFile(targetPath, fileBuffer) {
    return this.getProvider().uploadFile(targetPath, fileBuffer);
  }

  async getFile(targetPath) {
    return this.getProvider().getFile(targetPath);
  }

  async deleteFile(targetPath) {
    return this.getProvider().deleteFile(targetPath);
  }
}

export default new StorageProviderFacade();
