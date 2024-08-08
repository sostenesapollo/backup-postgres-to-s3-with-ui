import { execSync } from 'child_process';
import dayjs from 'dayjs';
import { getBucketName, getDeviceName, getSettings, } from '~/routes/backup';
import { uploadFile } from '~/routes/files';
import fs from 'fs/promises';
import path from 'path';
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';

export const listBuckets = async () => {
  const client = new S3Client({});

  try {
    const command = new ListBucketsCommand({});
    const response = await client.send(command);
    
    const buckets = response.Buckets?.map(e=>e.Name);

    return buckets;
  } catch (err) {
    console.log("Error", err);
  }
};

export const restoreDatabase = async (file: string, log=console.log) => {
  const settings = await getSettings()
  const { databaseType, user, password, host, port, database, redisPassword } = settings;

  log(`Using settings: ${JSON.stringify(settings)}`);

  try {
    if(!file) return log({ error: 'File not provided' });

    const filePath = path.resolve(file);    
    await fs.access(filePath, fs.constants.F_OK);
    log({success: `File exists: [${file}]` });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      log({error: `File not found: [${file}]` });
    } else {
      log({ error: `Error checking file: ${error.message}`});
    }
  }

  const POSTGRES = `postgres:16-alpine`
  const backupFilePath = path.join(process.cwd(), file);

  try {
    const dropDatabaseCmd = `docker exec $(docker ps | grep ${POSTGRES} | awk '{print $1}') psql -U ${user} -d ${password} -c "DROP DATABASE ${database} WITH (FORCE);"`;
    const output = execSync(dropDatabaseCmd, { encoding: 'utf8' });
    
    log({success: output.toString() })
    log({success: 'Database dropped successfully' });
  } catch (error: any) {
    log({error: `Error dropping database: ${error.stderr}`});
  }

  try {
    const createDatabaseCmd = `docker exec $(docker ps | grep ${POSTGRES} | awk '{print $1}') psql -U ${user} -d ${password} -c "CREATE DATABASE ${database};"`;
    
    execSync(createDatabaseCmd, { stdio: 'inherit' });
    log({success: 'Database created successfully'});
  } catch (error: any) {
    log({error: `Error creating database: ${error.stderr}`});
  }

  try {
    const restoreCmd = `gunzip -c ${backupFilePath} | pg_restore --dbname="${databaseType}://${user}:${password}@${host}:${port}/${database}"`;
    
    execSync(restoreCmd, { stdio: 'inherit' });
    log({success: 'Database restored successfully'});
  }catch (error: any) {
    log({error: `Error restoring database: ${error.stderr}`});
  }

  try {
    const rediCmd = `docker exec $(docker ps | grep redis | awk '{print $1}') redis-cli -a ${redisPassword} flushall`;
    const output = execSync(rediCmd, { encoding: 'utf8' });

    log({success: output.toString()})
    log({success: 'REDIS flushed successfully'});
  } catch (error: any) {
    log({error: `Error flushing redis: ${error?.stderr}`});
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
    log({success: `Backup completed successfully: ${path}` });
  } catch (error: any) {
    log({ error: 'Error during database backup' })
    log({ error: error.message })
    process.exit(1);
  }

  try {
    log('Uploading file to s3...');
    await uploadFile(path, bucket, filename);
    log({success: 'File uploaded successfully' });
  } catch (error: any) {
    log({ error: 'Error uploading backup file' })
    log({ error: error.message })
    process.exit(1);
  }

  try {
    log('Removing .tar.gz files...');
    await removeTarGzFiles();
    log({success: 'File removed successfully' });
  } catch (error: any) {
    log({ error: 'Error removing .tar.gz files' })
    log({ error: error.message })
    process.exit(1);
  }
};

async function removeTarGzFiles() {
  const directoryPath = process.cwd(); // Get the current working directory
  const files = await fs.readdir(directoryPath);
  
  for (const file of files) {
    const filePath = path.join(directoryPath, file);
    if (path.extname(filePath) === '.gz') {
      await fs.unlink(filePath);
    }
  }
}

export async function removeFile(file: string) {
  const filePath = path.resolve(file); // Resolves the file path to an absolute path
  await fs.unlink(filePath);
}