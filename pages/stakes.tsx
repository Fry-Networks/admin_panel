import {
  Card,
  Metric,
  Text,
  Title,
  BarList,
  Flex,
  Grid,
  MultiSelect,
  MultiSelectItem,
  TabPanel,
  TabPanels,
  TabGroup,
  TabList,
  Tab,
  NumberInput
} from '@tremor/react';
// Use pages-router search component for pages directory.
import Search from '../components/search';
import clientPromise from '../lib/mongoclient';
import { useEffect, useRef, useState } from 'react';
import RewardProductsTable from '../app/tables/table-reward-products';
import { getSession } from 'next-auth/react';
import UserForm from '../components/form-user';
import RemoveUserForm from '../components/remove-user';
import { Product } from '../lib/products-schema';
import { FryToken } from '../lib/tokens-schema';
import StakeProductsTable from '../app/tables/table-stake-products';

export default function StakesPage({
  products,
  tokens
}: {
  products: Product[];
  tokens: FryToken[];
}) {
  const [normalProducts, setNormalProducts] = useState<Product[]>([]);
  const [nodeProducts, setNodeProducts] = useState<Product[]>([]);
  useEffect(() => {
    const nodes = products.filter((product) => {
    const name = product.name.toLowerCase();
    return name.includes('node') || name.includes('edge');
    });

    const normals = products.filter((product) => {
    const name = product.name.toLowerCase();
    return !name.includes('node') && !name.includes('edge');
    });

    setNormalProducts(normals);
    setNodeProducts(nodes);
  }, [products, tokens]);
  return (
    <main className="p-4 md:p-10 mx-auto max-w-8xl">
      <Title>Wix Products</Title>
      <TabGroup>
        <TabPanels>
          <TabPanel>
            <Flex flexDirection="row" className="mt-6">
              <div style={{ marginTop: '20px' }}>
                <Text>{products?.length} products found!</Text>
              </div>
            </Flex>

            <Card className="mt-6">
              <StakeProductsTable
                products={normalProducts}
                tokens={tokens}
                node={false}
              />
            </Card>

            <Card className="mt-6">
              <StakeProductsTable
                products={nodeProducts}
                tokens={tokens}
                node={true}
              />
            </Card>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </main>
  );
}

export async function getServerSideProps(context: any) {
  const session = await getSession(context);
  /*if (!session || !session.user?.admin) {
      return {
        props: { error: 'Unauthorized access' },
      };
    }*/

  //TODO: A enelver
  try {
    const client = await clientPromise;
    const db = client.db('main');

    const products = await db.collection('products').find({}).toArray();
    const config = await db.collection('configs').findOne({ name: 'rewards' });
    console.log('hey', config);
    const tokens = await db.collection('tokens').find({}).toArray();
    return {
      props: {
        products: JSON.parse(JSON.stringify(products)),
        tokens: JSON.parse(JSON.stringify(tokens)),
        enabled: config?.enabled
      }
    };
  } catch (e) {
    console.error(e);
    return {
      props: { error: 'Failed to fetch data' }
    };
  }
}
