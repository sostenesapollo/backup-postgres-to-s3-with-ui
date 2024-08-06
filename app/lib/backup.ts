import { execSync } from 'child_process';
import dayjs from 'dayjs';
import { getBucketName, getDeviceName } from '~/routes/backup';
import { uploadFile } from '~/routes/files';
import fs from 'fs/promises';
import path from 'path';

export const backupDatabase = async () => {
  const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/pedegas'
  const formattedDate = dayjs().format('YYYY-MM-DD____HH:mm:ss');
  const bucket = await getBucketName()
  const filename = `${await getDeviceName()}__${bucket}__${formattedDate}.tar.gz`;
  const path = filename
  
  try {
    console.log('Starting database backup...');
    execSync(`pg_dump --dbname="${DATABASE_URL}" --format=custom | gzip > "${path}"`);
    console.log(`Backup completed successfully: ${path}`);
  } catch (error) {
    console.error('Error during database backup:', error.message);
    process.exit(1);
  }

  await uploadFile(path, bucket, filename);
  await removeTarGzFiles();
};

async function removeTarGzFiles() {
  try {
    const directoryPath = process.cwd(); // Get the current working directory
    const files = await fs.readdir(directoryPath);

    
    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      console.log(directoryPath, file, path.extname(filePath));
      if (path.extname(filePath) === '.gz') {
        await fs.unlink(filePath);
        console.log(`Deleted ${filePath}`);
      }
    }
  } catch (error) {
    console.error('Error removing .tar.gz files:', error);
  }
}

removeTarGzFiles()

// backupDatabase();
