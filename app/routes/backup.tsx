import { Button } from "~/components/ui/button";
import { Link, useLoaderData } from "@remix-run/react";
import { Check, Cloud, DatabaseBackup, Download, Trash, Upload, X } from "lucide-react";
import { ThemeToggle } from "./resources.theme-toggle";
import { prisma } from "~/db.server";
import { Input } from "~/components/ui/input";
import { useEffect, useState } from "react";
import axios from 'axios';
import { deleteFile, downloadFile, getFiles } from "./files";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import dayjs from '../../node_modules/dayjs/esm/index';
import { countRecords } from "~/lib/postgres";
import { listBuckets, removeFile, restoreDatabase } from "~/lib/backup";
import { twMerge } from "tailwind-merge";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { cronToText } from "~/lib/cron";

const presetValues = {
  cron: '0 * * * *',
  device: 'mac',
  bucket: 'pedegasbackups',
  s3MaxFilesToKeep: 5,
  // Db 
  databaseType: 'postgresql',
  user: 'postgres',
  password: 'postgres',
  host: 'localhost',
  port: '5432',
  database: 'pedegas',
  // Redis
  redisHost: 'localhost',
  redisUser: '',
  redisPort: '6379',
  redisPassword: 'eYVX7EwVmmxKPCDmwMtyKVge8oLd2t81',
  // 
  action: '',
};

export async function action({ request }: any) {
  const body = await request.json();
  // console.log('body', body);

  try {
    const count =await countRecords()
    // console.log(count);
    
  }catch(e){
    console.log('Eror to count records:', e);
  }
  
  if(body.action === 'delete') {
    const bucket = await getBucketName()
    console.log('remove', body, bucket);
    await deleteFile(bucket, body.key);
  }
  
  if(body.action === 'update') {
    await prisma.setting.updateMany({ where: { key: 'settings' }, data: { value: JSON.stringify({
      ...body.result,
    }) } });
  }

  if(body.action === 'restore') {
    const key = body.key;
    console.log('Baixando arquivo localmente.', body.key);
    await downloadFile(key)
    console.log('Baixado com sucesso.', body.key);
    console.log('Restaurando banco de dados.', body.key);
    await restoreDatabase(key, null);
    console.log('Restaurado com sucesso.', body.key);
    console.log('Removendo arquivo localmente.', body.key);
    await removeFile(key);
    console.log('Removido com sucesso.', body.key);
  }

  return {};
}

export async function getSettings() {
  const result = await prisma.setting.findFirst();
  const settings = JSON.parse(result?.value) as typeof presetValues;
  return settings;  
}

export async function getBucketName() {
  const result = await prisma.setting.findFirst();
  const settings = JSON.parse(result?.value);
  return settings['bucket'];  
}

export async function getDeviceName() {
  const result = await prisma.setting.findFirst();
  const settings = JSON.parse(result?.value);
  return settings['device'];  
}

export async function loader() {
  const result = await prisma.setting.findFirst();
  
  if (!result) {
    await prisma.setting.create({ data: { key: 'settings', value: JSON.stringify(presetValues) } });
    return {
      date: new Date(),
      result: presetValues,
    };
  }
  
  const bucket = await getBucketName();
  
  let files = []
  let error = null;
  try {
    files = await getFiles(bucket);
  } catch (_error) {
    error = _error
  }

  console.log('files', files?.length);
  

  let count, last_sale;
  try {
    const res = await countRecords('orders')
    count = res.count;
    last_sale = res.last_sale;
  } catch (e) {
    error = e.message;
    console.error('> Error to count Records:', error, 'msg:', e.message);
  }

  let buckets = [];
  try {
    buckets = await listBuckets()
  } catch (e) {
    error = e.message;
    console.error('>', error, 'msg:', e.message);
  }

  return {
    date: new Date(),
    result: JSON.parse(result.value),
    files: files,
    error,
    count,
    last_sale,
    buckets
  };
}

const Loading = ({className=""}) => <svg aria-hidden="true" className={`inline w-6 h-6 mr-2 text-gray-50 animate-spin dark:text-gray-200 fill-pink-600 ${className}`} viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
<path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
</svg>

export default function Index() {
  const _data = useLoaderData<typeof loader>();

  const [data, setData] = useState(_data);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const update = async () => {
    try {
      await axios.post('/backup', {...data, action: 'update', files: undefined, buckets: undefined});
      if(data.error) {
        window.location.reload();
      }
      setSuccessMessage('Updated successfully.');
      reloadFiles();
      setTimeout(() => setSuccessMessage(''), 2000); // Hide message after 2 seconds
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  const [clickedId, setClickedId] = useState(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);
  const [loadingRemove, setLoadingRemove] = useState(false);

  const remove = async (key: string) => {
    // setLoadingRemove(true);
    try {
      await axios.post('/backup', {key, action: 'delete'});
      setSuccessMessage('Removido com sucesso.');
      reloadFiles();
      setTimeout(() => setSuccessMessage(''), 2000); // Hide message after 2 seconds
    } catch (error) {
      console.error('Update failed:', error);
    } finally {
      // setLoadingRemove(false);
    }
  }

  const reloadFiles = () => {
    axios.get('/files').then((response) => {
      setData((data)=>({...data, files: response.data.files}));
    })
  }

  const newBackup = async () => {
    setAction(()=> 'backup' as any)
  };

  const restore = async (fileKey: string) => {
    setClickedId(()=>fileKey as any)
    setAction(()=> 'restore' as any)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setData((prevData) => ({
      ...prevData,
      result: { 
        ...prevData.result,
        [name]: value
      }
    }));
  };

  const [messages, setMessages] = useState<string[]>([]);

  const [action, setAction] = useState(null);

  useEffect(() => {
    let eventSource = null as any;
  
    if(!action) return;
  
    console.log('>>>', action);
  
    if(action === 'restore') {
      eventSource = new EventSource("/events?action=restore&file="+clickedId);
    } else if(action === 'backup') {
      eventSource = new EventSource("/events?action=backup");
    }
  
    setLoading(true)
  
    eventSource.onmessage = (event: any) => {
      const data = JSON.parse(event.data);
      
      if(data.message.error) {
        toast.error(data.message?.error, {autoClose: 10000});
      }else if(data.message.success){
        toast.success(data.message?.success, {autoClose: 10000});
      } else {
        toast.info(data.message, {autoClose: 10000});
      }

      // setMessages((prevMessages) => [...prevMessages, data.message]);
    };
  
    eventSource.onerror = () => {
      setLoading(()=>false)
      setAction(null)
      console.error("EventSource failed");
      eventSource.close();
    };
  
    return () => {
      console.log('finished.');
      reloadFiles();
      eventSource?.close();
    };
  }, [action]);

  const textCron = cronToText(data.result.cron);
  const isSaveDisabled = textCron?.error;

  return (
    <section className="">
      <ToastContainer />

      <div className="flex">
        {/* <div>
          <pre>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div> */}
        <div>
          {messages.map((message: any, index) => (
            message?.error ? 
              <p key={index} className="bg-red-300 px-2">{message.error}</p> :
              <p key={index} className="bg-green-400">{message}</p>
          ))}
        </div>
      </div>   

      <nav className="flex items-center justify-between p-4 w-full">
        <Link to="/" className="flex items-center space-x-2">
          <DatabaseBackup className="h-8 w-8" />
          <h1 className="text-xl font-semibold">Database Thing</h1>
        </Link>
        <ThemeToggle />
      </nav>

      {successMessage &&(
        <span className={`fixed bottom-4 right-4 bg-green-600 text-white p-3 rounded shadow-lg transition-transform duration-500 ${successMessage ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {successMessage}
        </span>
      )}
      
      {data?.error && (
        <span className={`fixed bottom-4 right-4 bg-red-600 text-white p-3 rounded shadow-lg transition-transform duration-500 opacity-100 z-10 translate-y-0`}>
          Error check the logs:
          <pre>
          {JSON.stringify(data?.error, null, 2)}
          </pre>
        </span>
      )}

      <div className="container flex flex-col space-y-4">
        <form onSubmit={(e)=>{ e.preventDefault(); update()} }>
        
          <p className="font-bold text-xl">S3 and Cron settings</p>

          <div className="flex flex-row items-start flex-grow gap-3">
            <div className="flex flex-col grow-1">
              <label htmlFor="device" className="mb-2 font-medium">Device label</label>
              <Input
                id="device"
                placeholder="Dispositivo"
                name="device"
                value={data.result.device}
                onChange={handleChange}
              />
            </div>

            <div className="flex flex-col grow">
              <label htmlFor="bucket" className="mb-2 font-medium">Bucket</label>
              {/* <Input
                id="bucket"
                placeholder="Bucket"
                name="bucket"
                value={data.result.bucket}
                onChange={handleChange}
              /> */}
              <select
                id="bucket"
                name="bucket"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={data.result.bucket}
                onChange={handleChange}
              >
                {data?.buckets?.map((bucket) => (
                  <option key={bucket} value={bucket}>{bucket}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col grow w-24" >
              <label htmlFor="s3MaxFilesToKeep" className="mb-2 font-medium">Number of Files to keep</label>
              <Input
                id="s3MaxFilesToKeep"
                placeholder="Number of Files to keep"
                name="s3MaxFilesToKeep"
                type="number"
                min={1}
                value={data.result.s3MaxFilesToKeep}
                onChange={handleChange}
              />
            </div>

            <div className="flex flex-col grow w-24" >
              <label htmlFor="cron" className="mb-2 font-medium">Cron</label>
              <Input
                id="cron"
                placeholder="Cron"
                name="cron"
                value={data.result.cron}
                onChange={handleChange}
              />
              <div className={twMerge(
              textCron?.error ? 'text-red-500' : 'text-gray-500'
                )}>
                {textCron?.text}
                {textCron?.error}
              </div>
            </div>

          </div>

          {/* Database */}
          <p className="font-bold text-xl">Database info</p>
          <div className="flex gap-2">

            <div className="flex flex-col grow ">
              <label htmlFor="databaseType" className="mb-2 font-medium">Database type (postgres, mysql, sqlite...)</label>
              <Input
                id="databaseType"
                placeholder="databaseType"
                name="databaseType"
                value={data.result.databaseType}
                onChange={handleChange}
              />
            </div>

            <div className="flex flex-col">
              <label htmlFor="user" className="mb-2 font-medium">user</label>
              <Input
                id="user"
                placeholder="user"
                name="user"
                value={data.result.user}
                onChange={handleChange}
                className="grow"
              />
            </div>

            <div className="flex flex-col">
              <label htmlFor="password" className="mb-2 font-medium">password</label>
              <Input
                id="password"
                placeholder="password"
                name="password"
                type="password"
                value={data.result.password}
                onChange={handleChange}
                className="grow"
              />
            </div>

            <div className="flex flex-col">
              <label htmlFor="host" className="mb-2 font-medium">host</label>
              <Input
                id="host"
                placeholder="host"
                name="host"
                value={data.result.host}
                onChange={handleChange}
                className="grow"
              />
            </div>

            <div className="flex flex-col">
              <label htmlFor="port" className="mb-2 font-medium">port</label>
              <Input
                id="port"
                placeholder="port"
                name="port"
                value={data.result.port}
                onChange={handleChange}
                className="grow"
              />
            </div>

            <div className="flex flex-col">
              <label htmlFor="host" className="mb-2 font-medium">database</label>
              <Input
                id="database"
                placeholder="database"
                name="database"
                value={data.result.database}
                onChange={handleChange}
                className="grow"
              />
            </div>
            
          </div>

          {/* Redis */}
          <p className="font-bold text-xl">Redis</p>
          <div className="flex gap-2">

            <div className="flex flex-col">
              <label htmlFor="host" className="mb-2 font-medium">host</label>
              <Input
                id="host"
                placeholder="host"
                name="host"
                value={data.result.host}
                onChange={handleChange}
                className="grow"
              />
            </div>

            <div className="flex flex-col">
              <label htmlFor="redisUser" className="mb-2 font-medium">Redis User</label>
              <Input
                id="redisUser"
                placeholder="Redis User"
                name="redisUser"
                value={data.result.redisUser}
                onChange={handleChange}
                className="grow"
              />
            </div>

            <div className="flex flex-col">
              <label htmlFor="redisPort" className="mb-2 font-medium">Redis Port</label>
              <Input
                id="redisPort"
                placeholder="redisPort"
                name="redisPort"
                value={data.result.redisPort}
                onChange={handleChange}
                className="grow"
              />
            </div>

            <div className="flex flex-col">
              <label htmlFor="p" className="mb-2 font-medium">Redis Password</label>
              <Input
                id="redisPassword"
                placeholder="redisPassword"
                name="redisPassword"
                type="password"
                value={data.result.redisPassword}
                onChange={handleChange}
                className="grow"
              />
            </div>

            <div className="flex flex-col h-full mt-2">
              <p className="invisible">_</p>
              <Button className='bg-green-600' onClick={update} disabled={isSaveDisabled}>
                <Check className="mr-2"/>
                Save
              </Button>
            </div>
            
          </div>

          <div className="flex flex-col">
              <label htmlFor="p" className="mb-2 font-medium">CURL after success</label>
              <textarea
                id="action"
                placeholder="action"
                name="action"
                value={data.result.action}
                onChange={handleChange as any}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
        </form>

        <div className="flex justify-between">
          <Button className='bg-blue-400' onClick={newBackup} disabled={loading}>
            {loading ? <Loading/> : <Cloud className="mr-3"/>}

            {loading ? 'Loading...' : 'Backup now !' }
          </Button>
          <div className="mt-2">
            Database connected current count: 
            <span className=" ml-5 bg-green-700 text-white text-xs p-1 rounded-xl">
              {data?.count}
            </span>
          </div>
          <div className="mt-2">
            Last record of tabled orders: {data?.last_sale}
          </div>
        </div>
      </div>

      <div className="container">
        {/* {JSON.stringify(data)} */}
        <Table>
          <TableCaption>
            S3 bucket files
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Size</TableHead>
              <TableHead>Keys</TableHead>
              <TableHead>Filename - File Key</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.files?.map((file, id) => (
              <TableRow key={file.key}>
                <TableCell>
                  {Math.round(file.size / 1000000)} mb
                </TableCell>
                <TableCell>
                  {file.tags?.map((tag) => (
                    <span key={tag.Key} className="mr-2 bg-blue-700 text-white text-xs p-1 rounded-xl">
                      {tag.Key}: {tag.Value}
                    </span>
                  ))}
                </TableCell>
                <TableCell className="font-medium">{file.key}</TableCell>
                <TableCell>{dayjs(new Date(file.lastModified)).format('DD / MM / YYYY')}</TableCell>
                <TableCell>{dayjs(new Date(file.lastModified)).format('HH:mm')}</TableCell>
                <TableCell className="flex flex-col">
                  {confirmRemoveId === file.key ?
                    <div className="bg-red-700 pt-2">
                      <div>
                        <button
                          type="button"
                          className={"ml-2 text-white bg-green-600 border border-green-700 hover:bg-green-700 hover:text-white focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-full text-sm text-center inline-flex items-center dark:border-green-500 dark:text-green-500 dark:hover:text-white dark:focus:ring-green-800 dark:hover:bg-green-500"}
                          onClick={()=>remove(file.key)}
                          disabled={loadingRemove}
                        >
                          {loadingRemove ? <Loading className="m-1"/> : <Check className="m-1"/>}
                        </button>
                        <button
                          type="button"
                          className={"ml-2 text-white bg-gray-600 border border-gray-700 hover:bg-gray-700 hover:text-white focus:ring-4 focus:outline-none focus:ring-gray-300 font-medium rounded-full text-sm text-center inline-flex items-center dark:border-gray-500 dark:text-gray-500 dark:hover:text-white dark:focus:ring-gray-800 dark:hover:bg-gray-500"}
                          onClick={()=>{
                            confirmRemoveId && setConfirmRemoveId(null)
                          }}
                          disabled={loadingRemove}
                        >
                          <X className="m-1"/>
                        </button>
                      </div>
                      <div className="text-white pl-3 pb-2">
                        <span className="text-2xl">
                          Confirm remove ? 
                        </span>
                        <p></p>
                        <span className="text-xs">
                          <p className="font-bold">
                            File {file.key} will be permanently removed
                          </p>
                        </span>
                        <p>Be careful, this operation cannot be reverted !</p>
                      </div>
                    </div> :
                    <div className="flex">
                      <button
                        type="button"
                        className={twMerge(
                          "pr-2 text-white bg-blue-500 border border-blue-700 hover:bg-blue-700 hover:text-white focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm text-center inline-flex items-center dark:border-blue-500 dark:text-blue-500 dark:hover:text-white dark:focus:ring-blue-800 dark:hover:bg-blue-500",
                          id === clickedId && 'bg-green-600'
                        )}
                        onClick={()=>{
                          setClickedId(id)
                          setAction('restore' as any)
                          restore(file.key)
                        }}
                      >
                        {/* {clickedId} */}
                        {id === clickedId ? <Loading className="ml-3"/> : <Download className="m-1"/>}
                        {id === clickedId ? 'Restoring...' : 'Restore'}
                      </button>
                      <button
                        type="button"
                        className={"ml-2 text-white bg-red-600 border border-red-700 hover:bg-red-700 hover:text-white focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-full text-sm text-center inline-flex items-center dark:border-red-500 dark:text-red-500 dark:hover:text-white dark:focus:ring-red-800 dark:hover:bg-red-500"}
                      >
                        <Trash className="m-1" onClick={()=>setConfirmRemoveId(file.key)}/>
                      </button>
                    </div>
                  }
                </TableCell>
                
              </TableRow>
            ))}
          </TableBody>
        </Table>     

      </div>
    </section>
  );
}
