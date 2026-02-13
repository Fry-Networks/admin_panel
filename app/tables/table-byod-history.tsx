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
import { TimeInput } from '@heroui/date-input';
import { Time } from '@internationalized/date';
import { useSession } from 'next-auth/react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/router';
import { Fee } from '../../lib/fee-schema';
import { FryToken } from '../../lib/tokens-schema';
import { ByodUser } from '../../lib/byod-schema';

export default function ByodHistoryTable({
  byodPayments
}: {
  byodPayments: ByodUser[];
}) {
  return (
    <div className="mt-5">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Email</TableHeaderCell>
            <TableHeaderCell>Price</TableHeaderCell>
            <TableHeaderCell>Payment Date</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {byodPayments.map((byodPayment) => (
            <TableRow key={byodPayment.id}>
              <TableCell>{byodPayment.email}</TableCell>
              <TableCell>{byodPayment.payments.price}</TableCell>
              <TableCell>
                {new Date(byodPayment.payments.date).toDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'white', // Example background color
    color: '#6b7280',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
    minWidth: '320px'
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)' // Example overlay color
  }
};
