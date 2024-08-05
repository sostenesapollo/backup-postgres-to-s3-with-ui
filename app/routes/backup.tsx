import { Button } from "~/components/ui/button";
import { Link, useLoaderData } from "@remix-run/react";
import { DatabaseBackup } from "lucide-react";
import { ThemeToggle } from "./resources.theme-toggle";
import { prisma } from "~/db.server";
import { Input } from "~/components/ui/input";
import { useState } from "react";
import axios from 'axios';
import { getFiles } from "./files";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import dayjs from '../../node_modules/dayjs/esm/index';

const presetValues = {
  cron: '* * * * *',
  device: 'mac',
  action: ''
};

export async function action({ request, context }: any) {
  const body = await request.json();
  await prisma.setting.updateMany({ where: { key: 'settings' }, data: { value: JSON.stringify(body) } });
  return {};
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

  const files = await getFiles('pedegasbackups');

  console.log('result.value', result.value);

  return {
    date: new Date(),
    result: JSON.parse(result.value),
    files: files,
  };
}

export default function Index() {
  const _data = useLoaderData<typeof loader>();

  const [data, setData] = useState(_data.result);

  const update = async () => {
    await axios.post('/backup', data).then((response) => {
      console.log(response);
      
    });
    window.location.reload();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setData((prevData) => ({
      ...prevData,
      [name]: value,
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

      <div className="container flex flex-col space-y-4">
        <div className="flex flex-row items-start flex-grow  gap-3">
          <div className="flex flex-col grow">
            <label htmlFor="device" className="mb-2 font-medium">Dispositivo</label>
            <Input
              id="device"
              placeholder="Dispositivo"
              name="device"
              value={data.device}
              onChange={handleChange}
            />
          </div>

          <div className="flex flex-col grow">
            <label htmlFor="cron" className="mb-2 font-medium">Cron</label>
            <Input
              id="cron"
              placeholder="Cron"
              name="cron"
              value={data.cron}
              onChange={handleChange}
            />
          </div>

          <div className="flex flex-col h-full mt-2">  {/* Modificação aqui */}
            <p className="invisible">_</p>
            <Button variant={"destructive"} onClick={update}>Salvar modificações</Button>
          </div>
        </div>
      </div>



      <div className="container">
        <Table>
          <TableCaption>Listagem de todos os backups do S3.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Size</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Hora</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {_data?.files?.map((file) => (
              <TableRow>
                <TableCell>{Math.round(file.size/1000000)} mb</TableCell>
                <TableCell className="font-medium">{file.key}</TableCell>
                <TableCell>{ dayjs(new Date(file.lastModified)).format('DD / MM / YYYY')}</TableCell>
                <TableCell>{ dayjs(new Date(file.lastModified)).format('HH:mm')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
    </section>
  );
}
