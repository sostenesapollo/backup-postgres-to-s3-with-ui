import { LoaderFunction } from "@remix-run/node"; // Ensure using server-side
import { ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { prisma } from "~/db.server";
import { getBucketName } from "./backup";

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