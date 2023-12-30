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
    Tab
  } from '@tremor/react';
  import Search from '../app/search';
  import clientPromise from '../lib/mongoclient';
  import { useState } from 'react';
  import ProductsTable from '../app/table-products';
  import { getSession } from 'next-auth/react';
  import UserForm from '../components/form-user';
  import RemoveUserForm from '../components/remove-user';
import { Product } from '../lib/products-schema';
  
  export default function UsersPage({
    products,
  }: {
    products: Product[];
  }) {
    //(VPN|OGPS|IGPS|IDB|ODB)
  
    return (
      <main className="p-4 md:p-10 mx-auto max-w-7xl">
        <Title>Wix Products</Title>
        <TabGroup>
          <TabPanels>
            <TabPanel>
              <Flex alignItems="end" flexDirection="row" className="mt-6">
                <Search />
              </Flex>
              <div style={{ marginTop: '20px' }}>
                <Text>{products.length} products found!</Text>
              </div>
  
              <Card className="mt-6">
                <ProductsTable products={products} />
              </Card>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </main>
    );
  }
  
  export async function getServerSideProps(context: any) {
    const session = await getSession(context);
    if (!session || !session.user.admin) {
      return {
        props: { error: 'Unauthorized access' }
      };
    }
    try {
      const client = await clientPromise;
      const db = client.db('main');
  
      const products = await db.collection('products').find({}).toArray();
  
      return {
        props: { products: JSON.parse(JSON.stringify(products)) }
      };
    } catch (e) {
      console.error(e);
    }
  }
  