import { LoaderFunction } from "@remix-run/node"; // Ensure using server-side
import { ListObjectsV2Command, DeleteObjectCommand, GetObjectCommand, GetObjectTaggingCommand } from "@aws-sdk/client-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { prisma } from "~/db.server";
import { getBucketName } from "./backup";
import { PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import { countRecords } from "~/lib/postgres";

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
  
  const files = data.Contents?.map(async (file) => {
      const tagsData = await s3.send(new GetObjectTaggingCommand({ Bucket: bucket, Key: file.Key }));
      
      return {
          key: file.Key,
          size: file.Size,
          lastModified: file.LastModified,
          tags: tagsData.TagSet, // Add the tags to the file object
      };
  });

  const resolvedFiles = await Promise.all(files || []);
  console.log(resolvedFiles);
  
  
  // Ordenar os arquivos pelos mais recentes
  const sortedFiles = resolvedFiles?.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

  return sortedFiles;
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

    let count: number | undefined;

    try {
      const rst = await countRecords();
      count = rst.count;
    } catch (error) {
      console.error('Error getting record count:', error);
    }

    // Prepare tags as a URL-encoded string
    const tags = count !== undefined ? `Count=${encodeURIComponent(count)}` : '';

    // Create the S3 upload parameters
    const params = {
      Bucket: bucket,
      Key: key,
      Body: fileContent,
      Tagging: tags, // Add tags as a URL-encoded string
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