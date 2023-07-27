import { Card, Metric, Text, Title, BarList, Flex, Grid } from '@tremor/react';
import { getServerSession } from 'next-auth';
import { MySession, authOptions } from '../../pages/api/auth/[...nextauth]';
import { connect } from '../../lib/connect';
import DeviceModel from '../../lib/devices-schema';
import Search from '../search';
import WeatherDevicesTable from '../table-weather-device';
import { checkSession } from '../sessionCheck';
import { WeatherAccountModel } from '../../lib/weather_accounts';


export default async function DevicesPage({
  searchParams,
}: {
  searchParams: { q: string };
}) {

  const search = searchParams.q ?? '';

  const session = await getServerSession(authOptions);
  const isForbidden = await checkSession(session);
  if (isForbidden) {
    return isForbidden;
  }
  console.log("search", search);
  const devices = await WeatherAccountModel.find({ "api_key": { $regex: search } });
  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl">
      <Title>Weather Devices</Title>
      <Search />
      <Card className="mt-6">
        <WeatherDevicesTable devices={devices} />
      </Card>
    </main>
  );

}