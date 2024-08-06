import { execSync } from 'child_process';
import dayjs from 'dayjs';
import { getBucketName, getDeviceName, } from '~/routes/backup';
import { uploadFile } from '~/routes/files';
import fs from 'fs/promises';
import { spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const exec = promisify(spawn);

export const restoreDatabase = async (file) => {
  try {
    if(!file) {
      console.error('File not provided');
      return;
    }

    const filePath = path.resolve(file);    
    await fs.access(filePath, fs.constants.F_OK);

    const backupFilePath = path.join(process.cwd(), file);

    const dropDatabaseCmd = `docker exec $(docker ps | grep postgres:16-alpine | awk '{print $1}') psql -U postgres -d postgres -c "DROP DATABASE pedegas WITH (FORCE);"`;
    const createDatabaseCmd = `docker exec $(docker ps | grep postgres:16-alpine | awk '{print $1}') psql -U postgres -d postgres -c "CREATE DATABASE pedegas;"`;
    const restoreCmd = `gunzip -c ${backupFilePath} | pg_restore --dbname="postgresql://postgres:postgres@localhost:5432/pedegas"`;

    try {
      const output = execSync(dropDatabaseCmd, { encoding: 'utf8' });
      console.log(output.toString());
      console.log('Database dropped successfully');
    } catch (error) {
      console.error('Error dropping database:', error.stderr);
    }

    execSync(createDatabaseCmd, { stdio: 'inherit' });
    execSync(restoreCmd, { stdio: 'inherit' });

    console.log('Database restored successfully.');
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error('File not found:', file);
    } else {
      console.error('Error checking file:', error);
    }
    console.error('Error during database restore:', error);
  }
};

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

export async function removeFile(file: string) {
  try {
    const filePath = path.resolve(file); // Resolves the file path to an absolute path

    await fs.unlink(filePath);
    console.log(`Deleted ${filePath}`);
  } catch (error) {
    console.error('Error removing file:', error);
  }
}


// removeTarGzFiles()

// backupDatabase();

// restoreDatabase('backup-2024-08-06T03-50-00-753Z.tar.gz')
