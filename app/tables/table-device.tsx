import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Text,
  Flex
} from '@tremor/react';
import { webUser } from '../../lib/webusers-model';
import { User } from '../../lib/users-schema';
import { Device } from '../../lib/devices-schema';

export default function DevicesTable({ devices }: { devices: Device[] }) {
  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    let day = date.getDate().toString().padStart(2, '0');
    let month = (date.getMonth() + 1).toString().padStart(2, '0'); // January is 0
    let year = date.getFullYear();
    let hours = date.getHours().toString().padStart(2, '0');
    let minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }


  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>Miner Key</TableHeaderCell>
          <TableHeaderCell>Infos</TableHeaderCell>
          <TableHeaderCell>Added on </TableHeaderCell>
          <TableHeaderCell>Order</TableHeaderCell>
          <TableHeaderCell>Email</TableHeaderCell>
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
              <Flex flexDirection='col' justifyContent='start' alignItems='start'>
              <Text>Registered: {device.is_registered ? 'Yes' : 'No'}</Text>
              <Text>Verified: {device.verified ? 'Yes' : 'No'}</Text>
              </Flex>
            </TableCell>
            <TableCell>
              <Text>{device.created_at ? formatDate(device.created_at) : "Unknown"}</Text>
            </TableCell>
            <TableCell>
              <Text>{device.order}</Text>
            </TableCell>
            <TableCell>
              <Text>{device.email}</Text>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
