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
import DevicesTable from '../app/table-device';
import { useEffect, useMemo, useState } from 'react';
import { Device } from '../lib/devices-schema';
import { getSession } from 'next-auth/react';
import { CSSTransition } from 'react-transition-group';
import '../app/css/devices.css';
import DeviceForm from '../components/form-device';
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@tremor/react';
import { User } from '../lib/users-schema';
import RemoveDeviceForm from '../components/remove-device';
import { useRouter } from 'next/router';

export default function DevicesPage({
  devices, totalDevices, currentPage, pageSize, users, searchParams
}: {
  devices: Device[];
  users: User[];
  searchParams: { q: string };
  totalDevices: number;
  currentPage: number;
  pageSize: number;
}) {
  const [page, setPage] = useState(currentPage);
  const router = useRouter();

  useEffect(() => {
    // Update the URL with the new page
    router.push(`?page=${page}&pageSize=${pageSize}`, undefined, { shallow: true });
  }, [page, pageSize, router]);
  const totalPages = Math.ceil(totalDevices / pageSize);

  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' for ascending, 'desc' for descending

  // Function to toggle sorting order
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  // Function to sort devices
  const sortDevices = (devices: Device[]) => {
    return devices.sort((a, b) => {
      const dateA = (new Date(a.created_at)).getTime();
      const dateB = (new Date(b.created_at)).getTime();
      console.log(dateA, dateB, 'date a and b');
      return sortOrder === 'asc' ? (dateA - dateB) : (dateB - dateA);
    });
  };
  const searchTerm = searchParams.q || '';
  const [selectValue, setSelectValue] = useState([
    'VPN',
    'OGPS',
    'IGPS',
    'IDB',
    'ODB'
  ]);
  const sortedDevices = useMemo(() => sortDevices([...devices]), [devices, sortOrder]);


  const filtered = useMemo(() => {
    return selectValue.length || searchTerm.length > 0
      ? sortedDevices.filter((device) => {
        const type = device.miner_key.split('-')[0];
        const contains = (original: string) => {
          if (!searchTerm) return true;
          return original.toLowerCase().includes(searchTerm.toLowerCase());
        };
        return selectValue.includes(type) && contains(device.miner_key);
      })
      : sortedDevices;
  }, [sortedDevices, selectValue, searchTerm]);

  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl">
      <Title>Devices</Title>

      <TabGroup>
        <TabList className="mt-8">
          <Tab>List</Tab>
          <Tab>Add Device</Tab>
          <Tab>Remove Device</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Flex alignItems="end" flexDirection="row" className="mt-6">
              <Search />
              <MultiSelect
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
              </MultiSelect>
            </Flex>
            <Button onClick={toggleSortOrder}>Toggle Sort Order</Button>
            <Text className="mt-4">
              {filtered.length} devices matching your search
            </Text>
            <Card className="mt-6">
              <DevicesTable devices={filtered} />
            </Card>
            <div className="pagination-controls">
              <Button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <Text>{page} of {totalPages}</Text>
              <Button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </TabPanel>
          <TabPanel>
            <DeviceForm users={users} />
          </TabPanel>
          <TabPanel>
            <RemoveDeviceForm devices={devices} />
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </main>
  );
}

export async function getServerSideProps(context: any) {
  const session = await getSession(context);
  if (!session || !session.user.admin) {
    return {
      props: { error: 'Unauthorized access' }
    };
  }


  try {

    const page = parseInt(context.query.page) || 1;
    const pageSize = parseInt(context.query.pageSize) || 10;


    const client = await clientPromise;
    const db = client.db('main');

    const skip = (page - 1) * pageSize;
    const devices = await db.collection('devices').find({}).skip(skip).limit(pageSize).toArray();
    const totalDevices = await db.collection('devices').countDocuments();

    const users = await db.collection('users').find({}).toArray();

    const searchParams = context.query;

    return {
      props: {
        devices: JSON.parse(JSON.stringify(devices)),
        totalDevices,
        users: JSON.parse(JSON.stringify(users)),
        searchParams,
        currentPage: page,
        pageSize
      }
    };
  } catch (e) {
    console.error(e);
  }
}
