import { Card, Metric, Text, Title, Button, Flex, Grid, MultiSelect, MultiSelectItem } from '@tremor/react';
import Search from '../app/search';
import clientPromise from '../lib/mongoclient';
import DevicesTable from '../app/table-device';
import { useState } from 'react';
import { Device } from '../lib/devices-schema';
import { getSession } from 'next-auth/react';
import { CSSTransition } from 'react-transition-group';
import '../app/css/devices.css';
import DeviceForm from './components/form-device';
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from "@tremor/react";
import { User } from '../lib/users-schema';
import RemoveDeviceForm from './components/remove-device';

export default function DevicesPage({ devices, users, searchParams }: { devices: Device[],users: User[], searchParams: { q: string } }) {
  const searchTerm = searchParams.q || "";
  const [selectValue, setSelectValue] = useState(["VPN", "OGPS", "IGPS", "IDB", "ODB"]);
  const [addingDevice, setAddingDevice] = useState(false);

  const filtered = (selectValue.length || searchTerm.length > 0) ? devices.filter((device) => {
    const type = device.miner_key.split("-")[0];
    const contains = (original: string) => {
      if (!searchTerm) return true;
      return original.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return (selectValue.includes(type) && contains(device.miner_key));

  }) : devices;

  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl">

      <Title>Devices</Title>

      <TabGroup>
        <TabList className="mt-8">
          <Tab >List</Tab>
          <Tab >Add Device</Tab>
          <Tab >Remove Device</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
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
            <Text className='mt-4'>
              {filtered.length} devices matching your search
            </Text>
            <Card className="mt-6">
              <DevicesTable devices={filtered} />
            </Card>
          </TabPanel>
          <TabPanel>
            <DeviceForm users={users}/>
          </TabPanel>
          <TabPanel>
            <RemoveDeviceForm devices={devices}/>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </main>
  );
}



export async function getServerSideProps(context: any) {
  const session = await getSession(context);
  if (!session || !session.user?.admin) {
    return {
      props: { error: 'Unauthorized access' },
    };
  }
  try {
    const client = await clientPromise;
    const db = client.db("main");

    const devices = await db
      .collection("devices")
      .find({})
      .toArray();
    const users = await db
      .collection("users")
      .find({})
      .toArray();

    const searchParams = context.query;

    return {
      props: { devices: JSON.parse(JSON.stringify(devices)),users: JSON.parse(JSON.stringify(users)), searchParams },
    };
  } catch (e) {
    console.error(e);
  }
}
