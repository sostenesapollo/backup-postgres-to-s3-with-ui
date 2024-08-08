import { LoaderFunction } from "@remix-run/node";
import { backupDatabase, restoreDatabase } from "~/lib/backup";

const logger = (sendEvent:any) => (message: any) => {
  sendEvent({ message });
  console.log(message);
}

export const loader: LoaderFunction = async ({ request }) => {
  try {
  const url = new URL(request.url);
  const action = url.searchParams.get("action")
  const file = url.searchParams.get("file")
  
  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (event: any) => {
        controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
      };
      
      const log = logger(sendEvent)

      let isClosed = false;
      
      const closeStream = () => {
        if (!isClosed) {
          isClosed = true;
          controller.close();
        }
      };

      log('Backup started');

      if(action === 'backup'){
        backupDatabase(log).then((msg)=>{
          log({success: 'Backup completed' });
          log({success: msg });
          closeStream();
        }).catch(e=>{
          log({ error: e.message })
          closeStream();
        })
      } else if(action === 'restore'){
        restoreDatabase(file, log).then((msg)=>{
          log({success: 'Process completed'});
          log(msg);
          
          closeStream();
        }).catch(e=>{
          log({ error: e.message })
          closeStream();
        })
      } else {
        log(`action not defined.`);
        closeStream();
      }

      // Handle request abortion
      request.signal.addEventListener('abort', () => {
        closeStream();
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });
  } catch (e) {
    console.error(e);
    return new Response(e.message, { status: 500 });
  }
};
