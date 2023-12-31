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
  import { useEffect, useState } from 'react';
  import ProductsTable from '../app/table-products';
  import { getSession } from 'next-auth/react';
  import UserForm from '../components/form-user';
  import RemoveUserForm from '../components/remove-user';
import { Product } from '../lib/products-schema';
  
  export default function RewardsPage() {
    const [products, setProducts] = useState<Product[]>([]);

    useEffect(() => {
      fetchProducts(); // Fetch products initially
    }, []);

    //(VPN|OGPS|IGPS|IDB|ODB)
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/get-products',{ // Replace with your actual API endpoint
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        setProducts(data.products);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      }
    };
  
    return (
      <main className="p-4 md:p-10 mx-auto max-w-7xl">
        <Title>Wix Products</Title>
        <TabGroup>
          <TabPanels>
            <TabPanel>  
              <div style={{ marginTop: '20px' }}>
                <Text>{products.length} products found!</Text>
              </div>
  
              <Card className="mt-6">
                <ProductsTable products={products} updateProducts={fetchProducts} />
              </Card>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </main>
    );
  }

  