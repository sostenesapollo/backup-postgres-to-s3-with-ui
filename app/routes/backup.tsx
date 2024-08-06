import { Button } from "~/components/ui/button";
import { Link, useLoaderData } from "@remix-run/react";
import { Check, Cloud, DatabaseBackup, Trash } from "lucide-react";
import { ThemeToggle } from "./resources.theme-toggle";
import { prisma } from "~/db.server";
import { Input } from "~/components/ui/input";
import { useState } from "react";
import axios from 'axios';
import { deleteFile, getFiles } from "./files";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import dayjs from '../../node_modules/dayjs/esm/index';

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

  console.log('files', files);
  
  return {
    date: new Date(),
    result: JSON.parse(result.value),
    files: files,
    error
  };
}

export default function Index() {
  const _data = useLoaderData<typeof loader>();

  const [data, setData] = useState(_data);
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
    try {
      await axios.post('/new-backup', {});
      // if(data.error) {
        window.location.reload();
      // }
      // setSuccessMessage('Modificado com sucesso.');
      // setTimeout(() => setSuccessMessage(''), 2000); // Hide message after 2 seconds
    } catch (error) {
      console.error('Update failed:', error);
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
        <span className={`fixed bottom-4 right-4 bg-red-600 text-white p-3 rounded shadow-lg transition-transform duration-500 opacity-100 translate-y-0`}>
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
        <div>
          <Button className='bg-blue-400' onClick={newBackup}><Cloud className="mr-3"/> Realizar Backup</Button>
        </div>
      </div>

      <div className="container">
        {/* {JSON.stringify(data)} */}
        <Table>
          <TableCaption>Listagem de todos os backups do S3.</TableCaption>
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
                      className={"text-white bg-red-600 border border-red-700 hover:bg-red-700 hover:text-white focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-full text-sm text-center inline-flex items-center dark:border-red-500 dark:text-red-500 dark:hover:text-white dark:focus:ring-red-800 dark:hover:bg-red-500"}
                  >
                    <Trash className="p-1" onClick={()=>remove(file.key)}/>
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
