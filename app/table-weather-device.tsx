import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Text,
  Button
} from '@tremor/react';
import Link from 'next/link';
import { webUser } from '../lib/webusers-model';
import { User } from '../lib/users-schema';
import { Device } from '../lib/devices-schema';
import { deviceData, weatherAccount } from '../lib/weather_accounts';
import { WeatherData } from '../lib/weather-schema';
import { useRouter } from 'next/router';
export default function WeatherDevicesTable({
  devices
}: {
  devices: deviceData[];
}) {
  const router = useRouter();
  console.log(devices, 'devices');
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>MAC Addr</TableHeaderCell>
          <TableHeaderCell>Coords</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {devices?.map((device) => (
          <TableRow key={device.deviceMAC}>
            <TableCell>{device.infos.name}</TableCell>
            <TableCell>
              <Text>{device.deviceMAC}</Text>
            </TableCell>
            <TableCell>
              <Text>
                {device.infos.coords.lat}, {device.infos.coords.lon}
              </Text>
            </TableCell>
            <TableCell>
              <Button
                onClick={() =>
                  router.push(`/weather/devices/${device.deviceMAC}`)
                }
                variant="secondary"
              >
                Show Data
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
