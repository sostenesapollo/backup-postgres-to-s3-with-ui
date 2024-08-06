import { Button } from "~/components/ui/button";
import { Link, useLoaderData } from "@remix-run/react";
import { Check, Cloud, DatabaseBackup, Download, Trash, Upload } from "lucide-react";
import { ThemeToggle } from "./resources.theme-toggle";
import { prisma } from "~/db.server";
import { Input } from "~/components/ui/input";
import { useState } from "react";
import axios from 'axios';
import { deleteFile, downloadFile, getFiles } from "./files";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import dayjs from '../../node_modules/dayjs/esm/index';
import { countRecords } from "~/lib/postgres";
import { removeFile, restoreDatabase } from "~/lib/backup";

const presetValues = {
  cron: '* * * * *',
  device: 'mac',
  bucket: 'pedegasbackups',
  databaseUrl: 'postgresql://postgres:postgres@localhost:5432/dbname',
  action: '',
};

export async function action({ request, context }: any) {
  const body = await request.json();
  console.log('body', body);

  try {
    const count =await countRecords()
    console.log(count);
    
  }catch(e){
    console.log(e);
  }
  
  if(body.action === 'delete') {
    const bucket = await getBucketName()
    console.log('remove', body, bucket);
    await deleteFile(bucket, body.key);
  }
  
  if(body.action === 'update') {
    await prisma.setting.updateMany({ where: { key: 'settings' }, data: { value: JSON.stringify({
      cron: body.result.cron,
      device: body.result.device,
      bucket: body.result.bucket,
      action: body.result.action,
      databaseUrl: body.result.databaseUrl,
    }) } });
  }

  if(body.action === 'restore') {
    const key = body.key;
    console.log('Baixando arquivo localmente.', body.key);
    await downloadFile(key)
    console.log('Baixado com sucesso.', body.key);
    console.log('Restaurando banco de dados.', body.key);
    await restoreDatabase(key);
    console.log('Restaurado com sucesso.', body.key);
    console.log('Removendo arquivo localmente.', body.key);
    await removeFile(key);
    console.log('Removido com sucesso.', body.key);
  }

  return {};
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

  console.log('files', files.length);
  

  let count, last_sale;
  try {
    const res = await countRecords('orders')
    count = res.count;
    last_sale = res.last_sale;
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
    last_sale
  };
}

export default function Index() {
  const _data = useLoaderData<typeof loader>();

  const [data, setData] = useState(_data);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const update = async () => {
    try {
      await axios.post('/backup', {...data, action: 'update'});
      if(data.error) {
        window.location.reload();
      }
      setSuccessMessage('Modificado com sucesso.');
      setTimeout(() => setSuccessMessage(''), 2000); // Hide message after 2 seconds
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  const restore = async (key: string) => {
    try {
      await axios.post('/backup', {key, action: 'restore'});
      setSuccessMessage('Restaurado com sucesso.');
      setTimeout(() => setSuccessMessage(''), 2000); // Hide message after 2 seconds

      // await axios.get('/files').then((response) => {
      //   setData((data)=>({...data, files: response.data.files}));
      // })
    } catch (error) {
      console.error('Update failed:', error);
    }
  }

  const remove = async (key: string) => {
    try {
      await axios.post('/backup', {key, action: 'delete'});
      setSuccessMessage('Modificado com sucesso.');
      setTimeout(() => setSuccessMessage(''), 2000); // Hide message after 2 seconds

      await axios.get('/files').then((response) => {
        setData((data)=>({...data, files: response.data.files}));
      })
    } catch (error) {
      console.error('Update failed:', error);
    }
  }

  const newBackup = async () => {
    setLoading(true)
    try {
      await axios.post('/new-backup', {});
      
      setSuccessMessage('Backup realizado com sucesso.');
      setTimeout(() => setSuccessMessage(''), 2000); // Hide message after 2 seconds
      
      await axios.get('/files').then((response) => {
        setData((data)=>({...data, files: response.data.files}));
      })
      
    } catch (error) {
      console.error('Update failed:', error);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <section className="">


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
          Erro ao carregar os arquivos do S3, verifique se o nome do bucket está correto:
          <pre>
          {JSON.stringify(data?.error, null, 2)}
          </pre>
        </span>
      )}

      <div className="container flex flex-col space-y-4">
        <div className="flex flex-row items-start flex-grow gap-3">
          <div className="flex flex-col grow-1">
            <label htmlFor="device" className="mb-2 font-medium">Dispositivo</label>
            <Input
              id="device"
              placeholder="Dispositivo"
              name="device"
              value={data.result.device}
              onChange={handleChange}
              onKeyDown={(e)=>{if(e.key === 'Enter') update()}}
            />
          </div>

          <div className="flex flex-col min-w-[440px]">
            <label htmlFor="databaseUrl" className="mb-2 font-medium">Url do banco</label>
            <Input
              id="databaseUrl"
              placeholder="Url do banco"
              name="databaseUrl"
              value={data.result.databaseUrl}
              onChange={handleChange}
              onKeyDown={(e)=>{if(e.key === 'Enter') update()}}
              className="grow"
            />
          </div>

          <div className="flex flex-col grow">
            <label htmlFor="bucket" className="mb-2 font-medium">Bucket</label>
            <Input
              id="bucket"
              placeholder="Bucket"
              name="bucket"
              value={data.result.bucket}
              onChange={handleChange}
              onKeyDown={(e)=>{if(e.key === 'Enter') update()}}
            />
          </div>

          <div className="flex flex-col grow " >
            <label htmlFor="cron" className="mb-2 font-medium">Cron</label>
            <Input
              id="cron"
              placeholder="Cron"
              name="cron"
              value={data.result.cron}
              onChange={handleChange}
              onKeyDown={(e)=>{if(e.key === 'Enter') update()}}
            />
          </div>

          <div className="flex flex-col h-full mt-2">
            <p className="invisible">_</p>
            <Button className='bg-green-600' onClick={update}>
              <Check className="mr-2"/>
              Salvar modificações
            </Button>
          </div>
        </div>
        <div className="flex justify-between">
          <Button className='bg-blue-400' onClick={newBackup} disabled={loading}>
            {loading ? (
              <svg aria-hidden="true" className={`inline w-6 h-6 mr-2 text-gray-50 animate-spin dark:text-gray-200 fill-pink-600`} viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
            </svg>
            ) : <Cloud className="mr-3"/>}

            {loading ? 'Fazendo o backup...' : 'Realizar Backup' }
          </Button>
          <div className="mt-2">
            Quantidade de vendas: {data?.count}
          </div>
          <div className="mt-2">
            Última venda: {data?.last_sale}
          </div>
        </div>
      </div>

      <div className="container">
        {/* {JSON.stringify(data)} */}
        <Table>
          <TableCaption>
            Listagem de todos os backups do S3.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Size</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Hora</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.files?.map((file) => (
              <TableRow key={file.key}>
                <TableCell>{Math.round(file.size / 1000000)} mb</TableCell>
                <TableCell className="font-medium">{file.key}</TableCell>
                <TableCell>{dayjs(new Date(file.lastModified)).format('DD / MM / YYYY')}</TableCell>
                <TableCell>{dayjs(new Date(file.lastModified)).format('HH:mm')}</TableCell>
                <TableCell>
                  <button
                    type="button"
                    className={"text-white bg-blue-500 border border-blue-700 hover:bg-blue-700 hover:text-white focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm text-center inline-flex items-center dark:border-blue-500 dark:text-blue-500 dark:hover:text-white dark:focus:ring-blue-800 dark:hover:bg-blue-500"}
                  >
                    <Download className="m-1" onClick={()=>restore(file.key)}/>
                  </button>
                  <button
                    type="button"
                    className={"ml-2 text-white bg-red-600 border border-red-700 hover:bg-red-700 hover:text-white focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-full text-sm text-center inline-flex items-center dark:border-red-500 dark:text-red-500 dark:hover:text-white dark:focus:ring-red-800 dark:hover:bg-red-500"}
                  >
                    <Trash className="m-1" onClick={()=>remove(file.key)}/>
                  </button>
                </TableCell>
                
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
