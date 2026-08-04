import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Text

} from '@tremor/react';
import { getTotalReduction } from './table-reductions';

export default function ReductionProductTable({
  productGroups,
  reductions,
  index
}: {
  productGroups: any[];
  reductions: any[];
  index: number;
}) {
  return (
    <div>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Key</TableHeaderCell>

            <TableHeaderCell>Unverified rewards</TableHeaderCell>
            <TableHeaderCell>Verified rewards 1.5x</TableHeaderCell>
            <TableHeaderCell>Verified rewards 3.0x</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {productGroups?.map((group) => (
            <TableRow key={group.key}>
              <TableCell>{group.name}</TableCell>
              <TableCell>
                <Text>{group.key}</Text>
              </TableCell>

              <TableCell>
                <Text>
                  {Math.round(
                    ((group.reward.unverified *
                      (100 - getTotalReduction(reductions, index))) /
                      100) *
                      100
                  ) / 100}
                </Text>
              </TableCell>
              <TableCell>
                <Text>{`${
                  ((Math.round(
                    (Math.round(group.reward.unverified * 100 * 1.5) / 100) *
                      (100 - getTotalReduction(reductions, index))
                  ) /
                    100) *
                    100) /
                  100
                }`}</Text>
              </TableCell>
              <TableCell>
                <Text>{`${
                  Math.round(
                    (((Math.round(group.reward.unverified * 100 * 3) / 100) *
                      (100 - getTotalReduction(reductions, index))) /
                      100) *
                      100
                  ) / 100
                }`}</Text>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
