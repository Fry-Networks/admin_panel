import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Text,
  Button
} from '@tremor/react';
import { webUser } from '../lib/webusers-model';
import { Product } from '../lib/products-schema';
import { useState } from 'react';

export default function ProductsTable({ products }: { products: Product[] }) {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
  };
  const closeModal = () => {
    setEditingProduct(null);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle the update logic here
    console.log('Updating product:', editingProduct);
    closeModal();
  };

  function formatDate(date: Date) {
    date = new Date(date);
    let day = date.getDate().toString().padStart(2, '0');
    let month = (date.getMonth() + 1).toString().padStart(2, '0'); // January is 0
    let year = date.getFullYear();
    let hours = date.getHours().toString().padStart(2, '0');
    let minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }
  console.log(products, 'products');

  return (
    <div>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Key</TableHeaderCell>
            <TableHeaderCell>Unverified rewards</TableHeaderCell>
            <TableHeaderCell>Verified rewards</TableHeaderCell>
            <TableHeaderCell>Added on </TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
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
              <TableCell>
                <Button
                  variant="secondary"
                  onClick={() => openEditModal(product)}
                >
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  color='red'
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {editingProduct && (
        <div className="modal">
          <form onSubmit={handleSubmit}>
            <h2>{editingProduct.name} - {editingProduct.key}</h2>
            <input type="text" value={editingProduct.reward.unverified} /> 
            <input type="text" value={editingProduct.reward.verified} />
            <button type="submit" style={{ backgroundColor: 'green' }}>Submit</button>
            <button type="button" onClick={closeModal}>Cancel</button>
          </form>
        </div>
      )}
    </div>

  );
}
