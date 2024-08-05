import { LoaderFunction } from "@remix-run/node"; // Ensure using server-side
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { S3Client } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env?.AWS_REGION,
  credentials: {
    accessKeyId: process.env?.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env?.AWS_SECRET_ACCESS_KEY,
  },
} as any);

export const loader: LoaderFunction = async ({request}: any) => {
  const files = await getFiles('pedegasbackups')

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