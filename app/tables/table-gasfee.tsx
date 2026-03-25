import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Badge
} from '@tremor/react';
import { GasFee } from '../../lib/gasfee-schema';

const gasTypeColors: Record<string, string> = {
  stake: 'emerald',
  unstake: 'red',
  claim: 'blue',
  compound: 'purple',
  deposit: 'cyan',
  withdraw: 'orange'
};

export default function GasFeeTable({ gasFees }: { gasFees: GasFee[] }) {
  const truncateString = (str: string, maxLength: number = 12) => {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return `${str.slice(0, 6)}...${str.slice(-4)}`;
  };

  const formatAmount = (amount: number) => {
    if (amount === undefined || amount === null) return '-';
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    });
  };

  return (
    <div className="mt-5">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Date</TableHeaderCell>
            <TableHeaderCell>Type</TableHeaderCell>
            <TableHeaderCell>Wallet</TableHeaderCell>
            <TableHeaderCell>Fee Amount</TableHeaderCell>
            <TableHeaderCell>Base Amount</TableHeaderCell>
            <TableHeaderCell>Fee %</TableHeaderCell>
            <TableHeaderCell>Tx ID</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {gasFees.map((gasFee) => (
            <TableRow key={gasFee._id.toString()}>
              <TableCell>
                {new Date(gasFee.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Badge color={gasTypeColors[gasFee.gasType] || 'gray'}>
                  {gasFee.gasType}
                </Badge>
              </TableCell>
              <TableCell title={gasFee.userId}>
                {truncateString(gasFee.userId)}
              </TableCell>
              <TableCell>{formatAmount(gasFee.gasAmount)}</TableCell>
              <TableCell>{formatAmount(gasFee.baseAmount)}</TableCell>
              <TableCell>{gasFee.feePercent}%</TableCell>
              <TableCell title={gasFee.txId}>
                {gasFee.txId ? (
                  <a
                    href={`https://explorer.algonode.io/tx/${gasFee.txId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {truncateString(gasFee.txId)}
                  </a>
                ) : (
                  '-'
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
