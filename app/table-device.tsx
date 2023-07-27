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

export default async function DevicesTable({ devices }: { devices: Device[] }) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>Miner Key</TableHeaderCell>
          <TableHeaderCell>Is registered ?</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {devices.map((device) => (
          <TableRow key={device.id}>
            <TableCell>{device.name}</TableCell>
            <TableCell>
              <Text>{device.miner_key}</Text>
            </TableCell>
            <TableCell>
              <Text>{device.is_registered ? 'Yes' : 'No'}</Text>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
