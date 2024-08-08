import { LoaderFunction } from "@remix-run/node"; // Ensure using server-side
import { ListObjectsV2Command, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { prisma } from "~/db.server";
import { getBucketName } from "./backup";
import { PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs/promises';

const s3 = new S3Client({
  region: process.env?.AWS_REGION,
  credentials: {
    accessKeyId: process.env?.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env?.AWS_SECRET_ACCESS_KEY,
  },
} as any);

export const loader: LoaderFunction = async ({request}: any) => {
  const bucket = await getBucketName()
  const files = await getFiles(bucket)

  return {
    files
  };
};

export async function getFiles(bucket: string) {
    const params = { Bucket: bucket };
    const data = await s3.send(new ListObjectsV2Command(params));
    const files = data.Contents?.map(file => ({
        key: file.Key,
        size: file.Size,
        lastModified: file.LastModified,
    }));
     // Ordenar os arquivos pelos mais recentes
    const sortedFiles = files?.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    return sortedFiles;
    // return files;
}

export async function deleteFile(bucket: string, key: string) {    
    const params = {
      Bucket: bucket,
      Key: key
    };

    await s3.send(new DeleteObjectCommand(params));
}

export async function uploadFile(filePath: string, bucket: string, key: string) {
  try {
    // Read the file as a buffer
    const fileContent = await fs.readFile(filePath);

    // Create the S3 upload parameters
    const params = {
      Bucket: bucket,
      Key: key,
      Body: fileContent,
    };

    // Upload the file to S3
    await s3.send(new PutObjectCommand(params));

    return true; // Indicate successful upload
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

export async function downloadFile(key: string, log=console.log) {
  try {
    const bucket = await getBucketName()
    const params = {
      Bucket: bucket,
      Key: key
    };

    const command = new GetObjectCommand(params);
    const response = await s3.send(command);

    await fs.writeFile(key, response.Body as Buffer);
    console.log(`File downloaded successfully to ${key}`);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
}