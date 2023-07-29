
import { Card, Metric, Text, Title, BarList, Flex, Grid, MultiSelect, MultiSelectItem } from '@tremor/react';
import Search from '../../app/search';
import clientPromise from '../../lib/mongoclient';
import { weatherAccount } from '../../lib/weather_accounts';
import WeatherDevicesTable from '../../app/table-weather-device';
import { getSession } from 'next-auth/react';


export default function WeatherDevicesPage({ accounts, searchParams }: { accounts: weatherAccount[], searchParams: { q: string } }) {
  const searchTerm = searchParams.q || "";
  const devices = accounts.map((account) => account.devices).flat();

  const filtered = (searchTerm.length > 0) ? devices.filter((device) => {
    const contains = (original: string) => {
      if (!searchTerm) return true;
      return original.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return contains(device.deviceMAC ?? "") || contains(device.infos.name.toString());
  }) : devices;
  //(VPN|OGPS|IGPS|IDB|ODB)



  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl">
      <Title>Weather Devices</Title>
      <Flex alignItems='end' flexDirection='row' className='mt-6'>
        <Search />
      </Flex>
      <div style={{ marginTop: '20px' }}>
        <Text >
          {filtered.length} devices matching your search
        </Text>
      </div>

      <Card className="mt-6">
        <WeatherDevicesTable devices={filtered} />
      </Card>
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

    const accounts = await db
      .collection("weather_accounts")
      .find({})
      .toArray();
    const searchParams = context.query;

    return {
      props: { accounts: JSON.parse(JSON.stringify(accounts)), searchParams },
    };
  } catch (e) {
    console.error(e);
  }
}
