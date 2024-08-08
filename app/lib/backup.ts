import { execSync } from 'child_process';
import dayjs from 'dayjs';
import { getBucketName, getDeviceName, getSettings, } from '~/routes/backup';
import { uploadFile } from '~/routes/files';
import fs from 'fs/promises';
import path from 'path';


export const restoreDatabase = async (file: string, log: any) => {
  const settings = await getSettings()
  const { databaseType, user, password, host, port, database, redisPassword } = settings;

  log(`Using settings: ${JSON.stringify(settings)}`);

  try {
    if(!file) return log({ error: 'File not provided' });

    const filePath = path.resolve(file);    
    await fs.access(filePath, fs.constants.F_OK);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      log(`File not found: [${file}]`);
    } else {
      log(`Error checking file: ${error.message}`);
    }
  }

  const POSTGRES = `postgres:16-alpine`
  const backupFilePath = path.join(process.cwd(), file);

  try {
    const dropDatabaseCmd = `docker exec $(docker ps | grep ${POSTGRES} | awk '{print $1}') psql -U ${user} -d ${password} -c "DROP DATABASE ${database} WITH (FORCE);"`;
    const output = execSync(dropDatabaseCmd, { encoding: 'utf8' });
    
    log(output.toString())
    log('Database dropped successfully');
  } catch (error: any) {
    log(`Error dropping database: ${error.stderr}`);
  }

  try {
    const createDatabaseCmd = `docker exec $(docker ps | grep ${POSTGRES} | awk '{print $1}') psql -U ${user} -d ${password} -c "CREATE DATABASE ${database};"`;
    
    execSync(createDatabaseCmd, { stdio: 'inherit' });
    log('Database created successfully');
  } catch (error: any) {
    log(`Error creating database: ${error.stderr}`);
  }

  try {
    const restoreCmd = `gunzip -c ${backupFilePath} | pg_restore --database="${databaseType}://${user}:${password}@${host}:${port}/${database}"`;
    
    execSync(restoreCmd, { stdio: 'inherit' });
    log('Database restored successfully');
  }catch (error: any) {
    log(`Error restoring database: ${error.stderr}`);
  }

  try {
    const rediCmd = `docker exec $(docker ps | grep redis | awk '{print $1}') redis-cli -a ${redisPassword} flushall`;
    const output = execSync(rediCmd, { encoding: 'utf8' });

    log(output.toString())
    log('REDIS flushed successfully');
  } catch (error: any) {
    log(`Error flushing redis: ${error.stderr}`);
  }


};

export const backupDatabase = async (log=console.log) => {
  const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/pedegas'
  const formattedDate = dayjs().format('YYYY-MM-DD____HH:mm:ss');
  const bucket = await getBucketName()
  const filename = `${await getDeviceName()}__${bucket}__${formattedDate}.tar.gz`;
  const path = filename
  
  try {
    const cmd = `pg_dump --dbname=${DATABASE_URL} --format=custom | gzip > "./${path}"`
    log('Starting database backup...');
    
    execSync(cmd);
    log(`Backup completed successfully: ${path}`);
  } catch (error: any) {
    log({ error: 'Error during database backup' })
    log({ error: error.message })
    process.exit(1);
  }

  try {
    log('Uploading file to s3...');
    await uploadFile(path, bucket, filename);
  } catch (error: any) {
    log({ error: 'Error uploading backup file' })
    log({ error: error.message })
    process.exit(1);
  }

  try {
    log('Removing .tar.gz files...');
    await removeTarGzFiles();
    log('Files removed successfully');
  } catch (error: any) {
    log({ error: 'Error removing .tar.gz files' })
    log({ error: error.message })
    process.exit(1);
  }
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
