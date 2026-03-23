import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Text,
  Button,
  Callout,
  NumberInput,
  TextInput,
  Flex,
  Select,
  SelectItem,
  Title
} from '@tremor/react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import Modal from 'react-modal';
import { webUser } from '../../lib/webusers-model';
import { Product, ProductModel } from '../../lib/products-schema';
import { useRef, useState } from 'react';
import ReactModal from 'react-modal';
import { FryToken } from '../../lib/tokens-schema';

export default function StakeProductsTable({
  products,
  tokens,
  node
}: {
  products: Product[];
  tokens: FryToken[];
  node: boolean;
}) {
  console.log('Node ' + node);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [globalMultiplier, setGlobalMultiplier] = useState(1);
  const [updateSuccess, setUpdateSuccess] = useState(''); // State to track update success

  const stakeOneRef = useRef<HTMLInputElement>(null);
  const stakeTwoRef = useRef<HTMLInputElement>(null);
  // FIP-012: USD amount refs for verification stakes
  const stakeOneUsdRef = useRef<HTMLInputElement>(null);
  const stakeTwoUsdRef = useRef<HTMLInputElement>(null);
  const stakeTokenRef = useRef<string | null>(null);
  const nodeStakeTokenRef = useRef<string | null>(null);
  const nodeStakeAmountRef = useRef<HTMLInputElement>(null);
  const registerTokenRef = useRef<string | null>(null);
  const registerUSDRef = useRef<HTMLInputElement>(null);

  const openEditModal = (product: Product) => {
    stakeTokenRef.current = product.reward.tokens?.stake ?? 'none';
    registerTokenRef.current = product.reward.tokens?.reward ?? 'none';
    setEditingProduct(product);
  };
  const closeModal = () => {
    setEditingProduct(null);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    // Ensure editingProduct is not null
    if (!editingProduct) {
      console.error('No product selected for editing');
      return;
    }

    const registerUSD = registerUSDRef.current?.value;
    const registerToken = registerTokenRef.current ?? 'none';

    const nodeStakeAmount = nodeStakeAmountRef.current?.value;
    const nodeStakeToken = nodeStakeTokenRef.current ?? 'none';

    const stakeToken = stakeTokenRef.current ?? 'none';
    const stake_one = stakeOneRef.current?.value;
    const stake_two = stakeTwoRef.current?.value;
    // FIP-012: USD amounts for verification stakes
    const stake_one_usd = stakeOneUsdRef.current?.value;
    const stake_two_usd = stakeTwoUsdRef.current?.value;

    // Ensure the values are retrieved
    if (stake_one === undefined || stake_two === undefined) {
      console.error('Form elements are missing');
      return;
    }

    const updateData = node
      ? {
          productId: editingProduct.wix_id,
          register_token: registerToken,
          register_price: registerUSD,
          node_token: nodeStakeToken,
          node_price: nodeStakeAmount,
          stake_one,
          stake_two,
          stake_one_usd,
          stake_two_usd,
          stake_token: stakeToken
        }
      : {
          productId: editingProduct.wix_id,
          register_token: registerToken,
          register_price: registerUSD,
          stake_one,
          stake_two,
          stake_one_usd,
          stake_two_usd,
          stake_token: stakeToken
        };

    try {
      console.log('Updating product:', editingProduct);

      const response = await fetch('/api/edit-product', {
        // Replace with your actual API endpoint
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        setUpdateSuccess('error'); // Reset success state
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Updated product:', result);
      setUpdateSuccess(editingProduct.name); // Set success state to true
      setTimeout(() => {
        window.location.reload();
        setUpdateSuccess('');
      }, 1000); // Reset success state after 3 seconds
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
      {updateSuccess != '' && updateSuccess != 'error' && (
        <Callout
          className="mt-4"
          title="Success"
          icon={CheckCircleIcon}
          color="teal"
        >
          Successfully updated {updateSuccess} !
        </Callout>
      )}
      {updateSuccess == 'error' && (
        <Callout
          className="mt-4"
          title="Error"
          icon={CheckCircleIcon}
          color="red"
        >
          Error updating product!
        </Callout>
      )}
      <Title>{node === true ? 'Fry Nodes' : 'Fry miners'}</Title>

      <Table className="mt-6">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Key</TableHeaderCell>
            <TableHeaderCell>Register Token</TableHeaderCell>
            <TableHeaderCell>Register Price(USD)</TableHeaderCell>
            {node && (
              <>
                <TableHeaderCell>Node Stake Token</TableHeaderCell>
                <TableHeaderCell>Node Stake Amount(USD)</TableHeaderCell>
              </>
            )}
            <TableHeaderCell>Verify Stake Token</TableHeaderCell>
            <TableHeaderCell>Stake 1 (USD)</TableHeaderCell>
            <TableHeaderCell>Stake 2 (USD)</TableHeaderCell>
            <TableHeaderCell>Legacy Stake (FRY)</TableHeaderCell>
            <TableHeaderCell>Added on </TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {products?.map((product) => (
            <TableRow key={product.wix_id}>
              <TableCell>{product.name}</TableCell>
              <TableCell>
                <Text>{product.key}</Text>
              </TableCell>
              <TableCell>
                {product.reward.tokens?.register &&
                product.reward.tokens?.register !== 'none'
                  ? tokens.find((value) => {
                      return value.asset_id === product.reward.tokens?.register;
                    })?.name
                  : 'None'}
              </TableCell>
              <TableCell>
                <Text>{`${product.reward.stake?.register ?? 0}`}</Text>
              </TableCell>
              {node && (
                <>
                  <TableCell>
                    {product.reward.tokens?.node &&
                    product.reward.tokens?.node !== 'none'
                      ? tokens.find((value) => {
                          return value.asset_id === product.reward.tokens?.node;
                        })?.name
                      : 'None'}
                  </TableCell>
                  <TableCell>
                    <Text>{`${product.reward.stake?.node ?? 0}`}</Text>
                  </TableCell>
                </>
              )}
              <TableCell>
                {product.reward.tokens?.stake &&
                product.reward.tokens?.stake !== 'none'
                  ? tokens.find((value) => {
                      return value.asset_id === product.reward.tokens?.stake;
                    })?.name
                  : 'None'}
              </TableCell>
              <TableCell>
                <Text>{`$${product.reward.stake?.stake_one_usd ?? 0}`}</Text>
              </TableCell>
              <TableCell>
                <Text>{`$${product.reward.stake?.stake_two_usd ?? 0}`}</Text>
              </TableCell>
              <TableCell>
                <Text>{`T1: ${product.reward.stake?.stake_one ?? 0} | T2: ${product.reward.stake?.stake_two ?? 0}`}</Text>
              </TableCell>
              <TableCell>
                <Text>
                  {product.created_at
                    ? formatDate(product.created_at)
                    : 'Unknown'}
                </Text>
              </TableCell>
              <TableCell>
                <Button
                  variant="secondary"
                  onClick={() => openEditModal(product)}
                >
                  Edit
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
        <h2 className="mb-4">
          <strong>Editting</strong> {editingProduct?.name} - (
          {editingProduct?.key})
        </h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Register token type:</label>
            <Select
              defaultValue={editingProduct?.reward.tokens?.register ?? 'none'}
              onValueChange={(value) => {
                registerTokenRef.current = value;
              }}
            >
              <SelectItem key={0} value="none">
                None
              </SelectItem>
              {tokens?.map((token, index) => {
                return (
                  <SelectItem key={index + 1} value={token.asset_id}>
                    {token.name}
                  </SelectItem>
                );
              })}
            </Select>
          </div>
          <div>
            <label>Register Price (USD):</label>
            <NumberInput
              ref={registerUSDRef}
              defaultValue={editingProduct?.reward.stake?.register ?? 0}
              step={1}
            />
          </div>
          {node && (
            <>
              <div>
                <label>Node Stake token type:</label>
                <Select
                  defaultValue={editingProduct?.reward.tokens?.node ?? 'none'}
                  onValueChange={(value) => {
                    nodeStakeTokenRef.current = value;
                  }}
                >
                  <SelectItem key={0} value="none">
                    None
                  </SelectItem>
                  {tokens?.map((token, index) => {
                    return (
                      <SelectItem key={index + 1} value={token.asset_id}>
                        {token.name}
                      </SelectItem>
                    );
                  })}
                </Select>
              </div>
              <div>
                <label>Node Stake Amount(USD):</label>
                <NumberInput
                  ref={nodeStakeAmountRef}
                  defaultValue={editingProduct?.reward.stake?.node ?? 0}
                  step={1}
                />
              </div>
            </>
          )}

          <div>
            <label>Verify Stake token type:</label>
            <Select
              defaultValue={editingProduct?.reward.tokens?.stake ?? 'none'}
              onValueChange={(value) => {
                stakeTokenRef.current = value;
              }}
            >
              <SelectItem key={0} value="none">
                None
              </SelectItem>
              {tokens?.map((token, index) => {
                return (
                  <SelectItem key={index + 1} value={token.asset_id}>
                    {token.name}
                  </SelectItem>
                );
              })}
            </Select>
          </div>
          <div className="mt-4 p-3 border border-blue-300 rounded bg-blue-50">
            <p className="text-sm text-blue-700 mb-2 font-semibold">FIP-012: USD-Pegged Verification Stakes</p>
            <div>
              <label>Stake 1 (USD) - 24h Lock:</label>
              <NumberInput
                ref={stakeOneUsdRef}
                defaultValue={editingProduct?.reward.stake?.stake_one_usd ?? 0}
                step={1}
                min={0}
              />
            </div>
            <div>
              <label>Stake 2 (USD) - 6 Month Lock:</label>
              <NumberInput
                ref={stakeTwoUsdRef}
                defaultValue={editingProduct?.reward.stake?.stake_two_usd ?? 0}
                step={1}
                min={0}
              />
            </div>
          </div>
          <div className="mt-4 p-3 border border-gray-300 rounded bg-gray-50">
            <p className="text-sm text-gray-500 mb-2">Legacy FRY Token Amounts (fallback if USD not set)</p>
            <div>
              <label>Stake Amount Tier 1 ($FRY):</label>
              <NumberInput
                ref={stakeOneRef}
                defaultValue={editingProduct?.reward.stake?.stake_one ?? 0}
                step={1}
              />
            </div>
            <div>
              <label>Stake Amount Tier 2 ($FRY):</label>
              <NumberInput
                ref={stakeTwoRef}
                defaultValue={editingProduct?.reward.stake?.stake_two ?? 0}
                step={1}
              />
            </div>
          </div>

          <div className="mb-4 mt-4">
            <Button type="submit" className="mr-2" variant="primary">
              Update
            </Button>
            <Button onClick={closeModal} variant="secondary">
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

const customStyles = {
  content: {
    backgroundColor: 'white', // Example background color
    color: '#6b7280',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)'
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)' // Example overlay color
  }
};
