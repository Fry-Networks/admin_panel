import {
    Card,
    Metric,
    Text,
    Title,
    Button,
    Flex,
    Grid,
    MultiSelect,
    MultiSelectItem
} from '@tremor/react';
import clientPromise from '../lib/mongoclient';
import { useEffect, useMemo, useState } from 'react';
import { getSession } from 'next-auth/react';
import '../app/css/devices.css';
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@tremor/react';
import { ByodUser } from '../lib/byod-schema';
import ByodTable from '../app/tables/table-byod';
import Search from '../app/search';
import { base32 } from '@scure/base';
export default function DevicesPage({
    byodUsers, currentPage, pageSize, searchParams
}: {
    byodUsers: ByodUser[];
    searchParams: { q: string };
    currentPage: number;
    pageSize: number;
}) {
    const [sortOrder, setSortOrder] = useState('asc'); // 'asc' for ascending, 'desc' for descending

    // Function to toggle sorting order
    const toggleSortOrder = () => {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    };

    // Function to sort devices
    console.log(searchParams)
    const searchTerm = searchParams?.q || '';
    // eslint-disable-next-line react-hooks/exhaustive-deps

    const [filtered, setFiltered] = useState<ByodUser[]>(byodUsers);

    useEffect(() => {
        const contains = (original: string) => {
            if (!searchTerm) return true;
            return original.toLowerCase().includes(searchTerm.toLowerCase());
        };

        const filteredUsers = searchTerm && searchTerm.length > 0
            ? byodUsers.filter(byod => {
                return contains(byod.email) || byod.licenses.some(license => contains(license.license)) || contains(byod.address);
            })
            : byodUsers;

        setFiltered(filteredUsers);
        console.log('Filtered Users:', filteredUsers);
    }, [searchTerm, byodUsers]);
    //@ts-ignore


    return (
        <main className="p-4 md:p-10 mx-auto max-w-max">
            <Title>Byod Users</Title>

            <TabGroup>
                <TabList className="mt-8">
                    <Tab>List</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel>
                        <Flex alignItems="end" flexDirection="row" className="mt-6">
                            <Search />
                            <Text className="mt-4">
                                {filtered?.length} byod users matching your search
                            </Text>
                        </Flex>
                        <Card className="mt-6">
                            <ByodTable byods={filtered} />
                        </Card>

                    </TabPanel>
                </TabPanels>
            </TabGroup>
        </main>
    );
}

export async function getServerSideProps(context: any) {
    const session = await getSession(context);
   /* if (!session || !session.user?.admin) {
        return {
            props: { error: 'Unauthorized access' },
        };
    }*/

    try {
       

        const client = await clientPromise;
        const db = client.db("main");
        const searchParams = context.query;
        const searchTerm = searchParams.q || '';

        // Build query based on search term
        const query = searchTerm.length > 0
            ? {
                $or: [
                    { email: { $regex: searchTerm, $options: 'i' } },
                    { address: { $regex: searchTerm, $options: 'i' } },
                    { 'licenses.license': { $regex: searchTerm, $options: 'i' } }
                ]
            }
            : {};

        const byods = await db
            .collection("byods")
            .find(query, { limit: 100 })
            .toArray();

        byods.map(byod => {
            const numberArray = byod.address.split(",").map((num: string) => parseInt(num, 10));
            const bytes = new Uint8Array(numberArray);

            // Encode to base32
            const address = base32.encode(bytes).split('=')[0];
            byod.address = address;
        });

        return {
            props: { byodUsers: JSON.parse(JSON.stringify(byods)), searchParams },
        };
    } catch (e) {
        console.error(e);
        return {
            props: { byodUsers: [], searchParams: { q: '' } }
        };
    }
}