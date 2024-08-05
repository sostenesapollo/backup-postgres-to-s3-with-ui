import { Button } from "~/components/ui/button";
import { Link, useLoaderData } from "@remix-run/react";
import { DatabaseBackup } from "lucide-react";
import { ThemeToggle } from "./resources.theme-toggle";
import { prisma } from "~/db.server";
import { Input } from "~/components/ui/input";
import { useState } from "react";
import axios from 'axios';

const presetValues = {
  cron: '* * * * *',
  device: 'mac',
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
  return {
    date: new Date(),
    result: JSON.parse(result.value),
  };
}

export default function Index() {
  const _data = useLoaderData<typeof loader>();

  const [data, setData] = useState(_data.result);

  const update = async () => {
    await axios.post('/backup', data).then((response) => {});
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

      <div className="container flex flex-row px-4 md:px-6 flex-1 py-8 overflow-x-hidden">
        <div className="container flex flex-col px-4 md:px-6 flex-1 py-8 overflow-x-hidden">
          Dispositivo
          <Input 
            placeholder="Dispositivo" 
            name="device" 
            value={data.device} 
            onChange={handleChange} 
          />
        </div>

        <div className="container flex flex-col px-4 md:px-6 flex-1 py-8 overflow-x-hidden">
          Cron
          <Input 
            placeholder="Cron" 
            name="cron" 
            value={data.cron} 
            onChange={handleChange} 
          />
        </div>
      </div>

      <div className="container flex flex-row justify-end px-4 md:px-6 flex-1 py-8 overflow-x-hidden">
        <Button variant={"secondary"} onClick={update}>Salvar modificações</Button>
      </div>
    </section>
  );
}
