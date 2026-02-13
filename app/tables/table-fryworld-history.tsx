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
import { FryWrold } from '../../lib/fryworld-schema';

export default function FryWorldHistoryTable({
  fryworldPayments,
  tokens
}: {
  fryworldPayments: FryWrold[];
  tokens: FryToken[];
}) {
  const getTokenNameById = (assetId: string) => {
    if (!tokens || tokens.length <= 0) {
      return assetId;
    }

    const token = tokens.find((token) => {
      return token.asset_id === assetId;
    });

    if (!token) {
      return assetId;
    }

    return token?.name;
  };

  return (
    <div className="mt-5">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Address</TableHeaderCell>
            <TableHeaderCell>Token Type</TableHeaderCell>
            <TableHeaderCell>Price</TableHeaderCell>
            <TableHeaderCell>TxId</TableHeaderCell>
            <TableHeaderCell>Created At</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {fryworldPayments.map((fryworldPayment) => (
            // Ensure a stable string key when MongoDB ObjectId is used.
            <TableRow key={fryworldPayment._id.toString()}>
              <TableCell>{fryworldPayment.address}</TableCell>
              <TableCell>
                {getTokenNameById(fryworldPayment.asset_id)}
              </TableCell>
              <TableCell>{fryworldPayment.price}</TableCell>
              <TableCell>{fryworldPayment.txId}</TableCell>
              <TableCell>
                {new Date(fryworldPayment.createdAt).toDateString()}
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
