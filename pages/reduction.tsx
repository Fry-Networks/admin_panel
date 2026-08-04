import { Card, TabGroup, TabPanel, TabPanels, Title } from '@tremor/react';
import { getSession } from 'next-auth/react';
import clientPromise from '../lib/mongoclient';
import ReductionsTable from '../app/tables/table-reductions';
import { Reduction } from '../lib/reductions-schema';
import { Product } from '../lib/products-schema';
import { useEffect, useState } from 'react';
import ReductionProductTable from '../app/tables/table-reduction-products';

export default function ReductionPage({
  reductions,
  count,
  productGroups
}: {
  reductions: Reduction[];
  count: number;
  productGroups: any[];
}) {
  const [showIndex, setShowIndex] = useState<number>(-1);
  const [localReductions, setLocalReductions] =
    useState<Reduction[]>(reductions);

  useEffect(() => {
    const initialIndex = reductions.findIndex(
      (reduction) =>
        count >= reduction.minDeviceCount && count <= reduction.maxDeviceCount
    );
    if (initialIndex !== -1) {
      setShowIndex(initialIndex);
    }
  }, [reductions, count]);

  const setReductions = (reductions: Reduction[]) => {
    setLocalReductions(reductions);
  };

  const setIndex = (index: number) => {
    setShowIndex(index);
  };

  return (
    <main className="p-4 md:p-10 mx-auto max-w-8xl bg-gray-950">
      <Title className="text-white">Reduction</Title>
      <TabGroup>
        <TabPanels>
          <TabPanel>
            <Card className="bg-gray-900 border-gray-700">
              <ReductionsTable
                reductions={localReductions}
                count={count}
                setReductions={setReductions}
                setShowIndex={setIndex}
              />
            </Card>
          </TabPanel>
        </TabPanels>
      </TabGroup>

      <Title className="mt-10 text-white">Reducted Products</Title>
      <TabGroup>
        <TabPanels>
          <TabPanel>
            <Card className="bg-gray-900 border-gray-700">
              <ReductionProductTable
                productGroups={productGroups}
                index={showIndex}
                reductions={localReductions}
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
  try {
    const client = await clientPromise;
    const db = client.db('main');

    const reductions = await db.collection('reductions').find({}).toArray();
    const rawProducts = await db.collection('products').find({}).toArray();
    const registeredDevicesCount = await db
      .collection('devices')
      .countDocuments({ is_registered: true });

    // Group products by key for display
    const groupMap: Record<string, any> = {};
    for (const p of rawProducts) {
      if (!groupMap[p.key]) {
        groupMap[p.key] = {
          key: p.key,
          name: p.display_name || p.name,
          variantCount: 0,
          reward: { unverified: 0, verified: 0 },
        };
      }
      groupMap[p.key].variantCount++;
      if (p.reward?.unverified > 0 && groupMap[p.key].reward.unverified === 0) {
        groupMap[p.key].reward = p.reward;
      }
    }
    const productGroups = Object.values(groupMap);

    return {
      props: {
        reductions: JSON.parse(JSON.stringify(reductions)),
        productGroups: JSON.parse(JSON.stringify(productGroups)),
        count: registeredDevicesCount
      }
    };
  } catch (error) {
    console.error(error);
    return {
      props: {
        error: 'Failed to fetch data'
      }
    };
  }
}
