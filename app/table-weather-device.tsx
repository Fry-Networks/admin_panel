import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Text
} from '@tremor/react';
import { webUser } from '../lib/webusers-model';
import { User } from '../lib/users-schema';
import { Device } from '../lib/devices-schema';
import { weatherAccount } from '../lib/weather_accounts';
export default function DevicesTable({ devices }: { devices: weatherAccount[] }) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Api Key</TableHeaderCell>
          <TableHeaderCell>Devices</TableHeaderCell>
          <TableHeaderCell>Idk</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {devices.map((device) => (
          <TableRow key={device.id}>
            <TableCell>{device.api_key}</TableCell>
            <TableCell>
              <Text>{device.devices.length}</Text>
            </TableCell>
            <TableCell>
              <Text>{device.user_id.toString()}</Text>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
