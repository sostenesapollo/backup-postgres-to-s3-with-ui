import { backupDatabase } from "~/lib/backup";
import { getBucketName } from "./backup";

export async function action({ request, context }: any) {
  const body = await request.json();

  await backupDatabase();
  console.log('finished.');
  
  return {};
}

export default function Index() {
  return (<></>)
}
