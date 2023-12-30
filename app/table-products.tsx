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
import { Product } from '../lib/products-schema';

export default function ProductsTable({ products }: { products: Product[] }) {
  function formatDate(date: Date) {
    let day = date.getDate().toString().padStart(2, '0');
    let month = (date.getMonth() + 1).toString().padStart(2, '0'); // January is 0
    let year = date.getFullYear();
    let hours = date.getHours().toString().padStart(2, '0');
    let minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }
  console.log(products, 'products');

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>Key</TableHeaderCell>
          <TableHeaderCell>Unverified rewards</TableHeaderCell>
          <TableHeaderCell>Verified rewards</TableHeaderCell>
          <TableHeaderCell>Added on </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.id}>
            <TableCell>{product.name}</TableCell>
            <TableCell>
              <Text>{product.key}</Text>
            </TableCell>
            <TableCell>
              <Text>{product.reward.unverified}</Text>
            </TableCell>
            <TableCell>
              <Text>{product.reward.verified}</Text>
            </TableCell>
            <TableCell>
              <Text>{product.created_at ? formatDate(product.created_at) : "Unknown"}</Text>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
