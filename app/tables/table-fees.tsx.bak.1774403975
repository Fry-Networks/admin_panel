import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Text,
  Flex,
  Button,
  Select,
  SelectItem,
  NumberInput,
  TextInput,
  DatePicker,
  Callout
} from '@tremor/react';
import { webUser } from '../../lib/webusers-model';
import { User } from '../../lib/users-schema';
import { useEffect, useRef, useState } from 'react';
import Modal from 'react-modal';
import { modalStylesWithMinWidth } from '../../lib/modal-styles';
import { TimeInput } from '@heroui/date-input';
import { Time } from '@internationalized/date';
import { useSession } from 'next-auth/react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/router';
import { Fee } from '../../lib/fee-schema';

export default function FeesTable({ fees }: { fees: Fee[] }) {
  return (
    <div className="mt-5">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Miner Key</TableHeaderCell>
            <TableHeaderCell>Address</TableHeaderCell>
            <TableHeaderCell>Fee Amount</TableHeaderCell>
            <TableHeaderCell>Price</TableHeaderCell>
            <TableHeaderCell>Created Date</TableHeaderCell>
            <TableHeaderCell>TxID</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {fees.map((fee) => (
            <TableRow key={fee.id}>
              <TableCell>{fee.miner_key}</TableCell>
              <TableCell>{fee.address}</TableCell>
              <TableCell>{fee.fee_amount}</TableCell>
              <TableCell>{fee.asset_id === '2681521901' ? 'N/A' : fee.price}</TableCell>
              <TableCell>{new Date(fee.createdAt).toDateString()}</TableCell>
              <TableCell>{fee.txID}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

