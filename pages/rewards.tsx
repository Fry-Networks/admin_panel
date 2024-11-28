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
import Search from '../app/search';
import clientPromise from '../lib/mongoclient';
import { useEffect, useRef, useState } from 'react';
import ProductsTable from '../app/tables/table-products';
import { getSession } from 'next-auth/react';
import UserForm from '../components/form-user';
import RemoveUserForm from '../components/remove-user';
import { Product } from '../lib/products-schema';
import { FryToken } from '../lib/tokens-schema';

export default function RewardsPage({
  products,
  tokens,
  enabled
}: {
  products: Product[];
  tokens: FryToken[];
  enabled: boolean;
}) {
  //(VPN|OGPS|IGPS|IDB|ODB)

  console.log(products);
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
              <ProductsTable
                products={products}
                enabled={enabled}
                tokens={tokens}
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
