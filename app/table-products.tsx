import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Text,
  Button,
  NumberInput,
} from '@tremor/react';
import Modal from 'react-modal';
import { webUser } from '../lib/webusers-model';
import { Product, ProductModel } from '../lib/products-schema';
import { useState } from 'react';
import ReactModal from 'react-modal';

export default function ProductsTable({ products }: { products: Product[] }) {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
  };
  const closeModal = () => {
    setEditingProduct(null);
  };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  
    // Ensure editingProduct is not null
    if (!editingProduct) {
      console.error('No product selected for editing');
      return;
    }
  
    try {
      const form = e.currentTarget;
      const unverifiedReward = form.elements.namedItem('unverifiedReward') as HTMLInputElement;
      const verifiedReward = form.elements.namedItem('verifiedReward') as HTMLInputElement;
  
      if (!unverifiedReward || !verifiedReward) {
        console.error('Form elements are missing');
        return;
      }
  
      // Update logic
      const updateData = {
        reward: {
          unverified: unverifiedReward.value,
          verified: verifiedReward.value,
        },
      };
  
      console.log('Updating product:', editingProduct);
      const response = await ProductModel.updateOne(
        { wix_id: editingProduct.wix_id },
        updateData
      );
  
      console.log('Updated product:', response);
    } catch (err) {
      console.error('Error updating product:', err);
    }
  
    // Reset editing product and close modal
    setEditingProduct(null);
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
      <Modal
        isOpen={!!editingProduct}
        onRequestClose={closeModal}
        closeTimeoutMS={500}
        style={customStyles}
        contentLabel="Edit Product"
      >
        <h2>Editting {editingProduct?.name} - ({editingProduct?.key})</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Unverified Reward:</label>
            <NumberInput defaultValue={editingProduct?.reward.unverified} />
          </div>
          <div>
            <label>Verified Reward:</label>
            <NumberInput defaultValue={editingProduct?.reward.verified} />
          </div>
          <div className='mb-4 mt-4'>
            <Button type="submit" className='mr-2' variant="primary">Update</Button>
            <Button onClick={closeModal} variant="secondary">Cancel</Button>
          </div>
        </form>
      </Modal>
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
    color: "#6b7280",
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)'
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)' // Example overlay color
  }
};