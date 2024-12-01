import {
  Card,
  Metric,
  Text,
  Title,
  Button,
  Flex,
  Grid,
  MultiSelect,
  MultiSelectItem
} from '@tremor/react';
import Search from '../app/search';
import clientPromise from '../lib/mongoclient';
import DevicesTable from '../app/tables/table-device';
import { useEffect, useMemo, useState } from 'react';
import { Device } from '../lib/devices-schema';
import { getSession } from 'next-auth/react';
import { CSSTransition } from 'react-transition-group';
import '../app/css/devices.css';
import DeviceForm from '../components/form-device';
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@tremor/react';
import { User } from '../lib/users-schema';
import ChangeDeviceForm from '../components/change-device';
import { useRouter } from 'next/router';

export default function DevicesPage({
  devices = [], // Default to an empty array if devices is undefined
  products,
  searchParams = {} // Default to an empty object if searchParams is undefined
}: {
  devices: Device[];
  searchParams: any;
  products: any[];
}) {
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' for ascending, 'desc' for descending

  // Function to toggle sorting order
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  // Function to sort devices
  const sortDevices = (devices: Device[]) => {
    return devices.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  };

  const searchTerm = searchParams.q || '';
  const [selectValue, setSelectValue] = useState([
    'VPN',
    'OGPS',
    'IGPS',
    'IDB',
    'ODB',
    'registered',
    'unregistered'
  ]);

  const sortedDevices = useMemo(
    () => sortDevices(devices),
    [devices, sortOrder]
  );

  return (
    <main className="p-4 md:p-10 mx-auto max-w-8xl">
      <Title>Devices</Title>

      <TabGroup>
        <TabList className="mt-8">
          <Tab>List</Tab>
          <Tab>Add Device</Tab>
          <Tab>Update Device</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Flex alignItems="end" flexDirection="row" className="mt-6">
              <Search />
              {/*<MultiSelect
                placeholder="Select a device type..."
                onValueChange={(value) => setSelectValue(value)}
                value={selectValue}
                style={{ marginLeft: '20px' }}
              >
                <MultiSelectItem value="VPN">VPN</MultiSelectItem>
                <MultiSelectItem value="OGPS">OGPS</MultiSelectItem>
                <MultiSelectItem value="IGPS">IGPS</MultiSelectItem>
                <MultiSelectItem value="IDB">IDB</MultiSelectItem>
                <MultiSelectItem value="ODB">ODB</MultiSelectItem>
                <MultiSelectItem value="registered">Registered</MultiSelectItem>
                <MultiSelectItem value="unregistered">Unregistered</MultiSelectItem>
              </MultiSelect>*/}
            </Flex>
            <Button className="mt-4" onClick={toggleSortOrder}>
              Toggle Sort Order
            </Button>
            <Text className="mt-4">
              {sortedDevices.length} devices matching your search
            </Text>
            <Card className="mt-6">
              <DevicesTable devices={sortedDevices} />
            </Card>
          </TabPanel>
          <TabPanel>
            <DeviceForm products={products} />
          </TabPanel>
          <TabPanel>
            <ChangeDeviceForm products={products} />
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
      props: { error: 'Unauthorized access' }
    };
  }

  //TODO: A enelver
  try {
    const client = await clientPromise;
    let products;
    const db = client.db('main');

    const searchParams = context.query;
    const searchTerm = searchParams.q || '';

    const query =
      searchTerm.length > 0
        ? {
            $or: [
              { order: { $regex: searchTerm, $options: 'i' } },
              { byod: { $regex: searchTerm, $options: 'i' } },
              { email: { $regex: searchTerm, $options: 'i' } }
            ]
          }
        : {};

    console.log('Query:', query);
    const devices = await db
      .collection('devices')
      .find(query)
      .limit(100)
      .toArray();
    console.log('Devices:', devices.length);
    if (!products) {
      products = await db.collection('products').find({}).toArray();
    }
    return {
      props: {
        devices: JSON.parse(JSON.stringify(devices)),
        products: JSON.parse(JSON.stringify(products)),
        searchParams
      }
    };
  } catch (e) {
    console.error(e);
    return {
      props: { error: 'Failed to fetch data' }
    };
  }
}
