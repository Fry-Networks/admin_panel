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
import { ByodUser } from '../lib/byod-schema';

export default function ByodTable({ byods }: { byods: ByodUser[] }) {

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Email</TableHeaderCell>
          <TableHeaderCell>Licenses</TableHeaderCell>
          <TableHeaderCell>Payments</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {byods.map((byod) => (
          <TableRow key={byod.id}>
            <TableCell>{byod.email}</TableCell>
            <TableCell>
              <Text>{byod.licenses.map(license => license + '\n')}</Text>
            </TableCell>
            <TableCell>
              <Text>{`Algo: ${byod.algo ? "Yes" : "No"} | Fry: ${byod.fry ? "Yes" : "No"}`}</Text>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
