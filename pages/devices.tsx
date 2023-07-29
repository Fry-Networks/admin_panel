import { Card, Metric, Text, Title, BarList, Flex, Grid, MultiSelect, MultiSelectItem } from '@tremor/react';
import Search from '../app/search';
import clientPromise from '../lib/mongoclient';
import DevicesTable from '../app/table-device';
import { useState } from 'react';
import { Device } from '../lib/devices-schema';


export default function DevicesPage({ devices, searchParams }: { devices: Device[], searchParams: { q: string } }) {
  const searchTerm = searchParams.q || "";
  const [selectValue, setSelectValue] = useState(["VPN", "OGPS", "IGPS", "IDB", "ODB"]);


  const filtered = (selectValue.length || searchTerm.length > 0) ? devices.filter((device) => {
    const type = device.miner_key.split("-")[0];
    const contains = (original: string) => {
      if (!searchTerm) return true;
      return original.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return (selectValue.includes(type) && contains(device.miner_key));

  }) : devices;
  //(VPN|OGPS|IGPS|IDB|ODB)



  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl">
      <Title>Devices</Title>
      <Flex alignItems='end' flexDirection='row' className='mt-6'>
        <Search />
        <MultiSelect placeholder="Select a device type..." onValueChange={(value) => setSelectValue(value)} value={selectValue} style={{ marginLeft: "20px" }}>
          <MultiSelectItem value="VPN">VPN</MultiSelectItem>
          <MultiSelectItem value="OGPS">OGPS</MultiSelectItem>
          <MultiSelectItem value="IGPS">IGPS</MultiSelectItem>
          <MultiSelectItem value="IDB">IDB</MultiSelectItem>
          <MultiSelectItem value="ODB">ODB</MultiSelectItem>
        </MultiSelect>
      </Flex>
      <div style={{ marginTop: '20px' }}>
        <Text >
          {filtered.length} devices matching your search
        </Text>
      </div>

      <Card className="mt-6">
        <DevicesTable devices={filtered} />
      </Card>
    </main>
  );

}

export async function getServerSideProps(context: any) {
  try {
    const client = await clientPromise;
    const db = client.db("main");

    const devices = await db
      .collection("devices")
      .find({})
      .toArray();
    const searchParams = context.query;

    return {
      props: { devices: JSON.parse(JSON.stringify(devices)), searchParams },
    };
  } catch (e) {
    console.error(e);
  }
}
