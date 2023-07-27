'use client';

import { Card, Metric, Text, Title, BarList, Flex, Grid } from '@tremor/react';
import { getServerSession } from 'next-auth';
import { MySession, authOptions } from '../../pages/api/auth/[...nextauth]';
import { connect } from '../../lib/connect';
import DeviceModel from '../../lib/devices-schema';
import Search from '../search';
import DevicesTable from '../table-device';


export default async function DevicesPage({
  searchParams,
}: {
  searchParams: { q: string };
}) {

  const search = searchParams.q ?? '';

  const session: MySession | null = await getServerSession(authOptions);
  if (!session || !session.user) {
    return (
      <main className="p-4 md:p-10 mx-auto max-w-7xl">
        <Title>Please login in order to access the admin panel</Title>
      </main>
    );
  } 
  await connect();
  if (!session.user.admin) {
    return (
      <main className="p-4 md:p-10 mx-auto max-w-7xl">
        <Title>This panel is only accessible to admin users.</Title>
      </main>
    );
  } else {
    console.log("search", search);
    const devices = await DeviceModel.find({ "name.full": { $regex: search } });
    return (
      <main className="p-4 md:p-10 mx-auto max-w-7xl">
        <Title>Devices</Title>
        <Text>
          Blabala
        </Text>
        <Search />
        <Card className="mt-6">
          <DevicesTable devices={devices} />
        </Card>
      </main>
    );
  }
}