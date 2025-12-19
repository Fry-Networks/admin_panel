import { Card, Title, Text, Button, Flex, Badge, Tab, TabGroup, TabList, TabPanel, TabPanels, Callout, TextInput, NumberInput } from '@tremor/react';
import { Dialog, DialogPanel, Divider } from '@tremor/react';
import { useEffect, useState } from 'react';
import { getSession } from 'next-auth/react';
import { CFIP, CFIPStatus, CFIP_CONFIG } from '../lib/cfip-schema';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { RiCloseLine, RiCheckLine, RiProhibitedLine, RiArrowUpLine } from '@remixicon/react';
import clientPromise from '../lib/mongoclient';

interface CFIPWithMeta extends CFIP { _id: string; }

const statusColors: Record<CFIPStatus, string> = { draft: 'gray', pending_review: 'yellow', community_voting: 'blue', approved_for_fip: 'emerald', rejected: 'red', vetoed: 'rose', promoted: 'green' };
const statusLabels: Record<CFIPStatus, string> = { draft: 'Draft', pending_review: 'Pending Review', community_voting: 'Community Voting', approved_for_fip: 'Approved by Community', rejected: 'Rejected', vetoed: 'Vetoed', promoted: 'Promoted to FIP' };

export default function CFIPAdminPage({ initialCFIPs }: { initialCFIPs: CFIPWithMeta[] }) {
  const [cfips, setCFIPs] = useState<CFIPWithMeta[]>(initialCFIPs);
  const [selectedCFIP, setSelectedCFIP] = useState<CFIPWithMeta | null>(null);
  const [actionModal, setActionModal] = useState<{ type: 'approve' | 'veto' | 'promote' | 'reject' | null; cfip: CFIPWithMeta | null }>({ type: null, cfip: null });
  const [notes, setNotes] = useState('');
  const [votingDays, setVotingDays] = useState(CFIP_CONFIG.DEFAULT_VOTING_PERIOD_DAYS);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshCFIPs = async () => { try { const response = await fetch('/api/cfip/list?limit=100'); if (response.ok) { const data = await response.json(); setCFIPs(data.cfips); } } catch (error) { console.error('Error refreshing CFIPs:', error); } };

  const handleAction = async () => {
    if (!actionModal.type || !actionModal.cfip) return;
    setLoading(true);
    try {
      const actionMap = { approve: 'approve-voting', veto: 'veto', promote: 'promote-to-fip', reject: 'reject' };
      const response = await fetch(`/api/cfip/admin/${actionMap[actionModal.type]}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cfipId: actionModal.cfip._id, notes, votingPeriodDays: votingDays }) });
      if (response.ok) { setFeedback({ type: 'success', message: 'Action completed successfully' }); await refreshCFIPs(); setActionModal({ type: null, cfip: null }); setNotes(''); }
      else { const error = await response.json(); setFeedback({ type: 'error', message: error.message }); }
    } catch (error) { setFeedback({ type: 'error', message: 'An error occurred' }); } finally { setLoading(false); }
  };

  useEffect(() => { if (feedback) { const timer = setTimeout(() => setFeedback(null), 5000); return () => clearTimeout(timer); } }, [feedback]);

  const renderCFIPCard = (cfip: CFIPWithMeta) => (
    <Card key={cfip._id} className="mb-4">
      <Flex justifyContent="between" alignItems="start">
        <div className="flex-1">
          <Flex justifyContent="start" alignItems="center" className="gap-2 mb-2">
            <Badge color={statusColors[cfip.status]}>{statusLabels[cfip.status]}</Badge>
            <Text className="text-xs text-gray-500">by {cfip.author.discordUsername}</Text>
          </Flex>
          <Title className="cursor-pointer hover:text-blue-600" onClick={() => setSelectedCFIP(cfip)}>{cfip.title}</Title>
          <Text className="mt-2 line-clamp-2">{cfip.description.substring(0, 200)}...</Text>
          {cfip.status === 'community_voting' && (
            <Flex className="mt-3 gap-4">
              <Text><span className="text-green-600 font-semibold">{cfip.community_votes.promote}</span> Promote</Text>
              <Text><span className="text-red-600 font-semibold">{cfip.community_votes.reject}</span> Reject</Text>
              {cfip.voting_end && <Text className="text-gray-500">Ends: {new Date(cfip.voting_end).toLocaleDateString()}</Text>}
            </Flex>
          )}
        </div>
        <Flex flexDirection="col" className="gap-2 ml-4">
          {cfip.status === 'pending_review' && <Button size="xs" color="blue" icon={RiCheckLine} onClick={() => setActionModal({ type: 'approve', cfip })}>Open Voting</Button>}
          {cfip.status === 'approved_for_fip' && <Button size="xs" color="green" icon={RiArrowUpLine} onClick={() => setActionModal({ type: 'promote', cfip })}>Promote to FIP</Button>}
          {!['vetoed', 'promoted', 'rejected'].includes(cfip.status) && <Button size="xs" color="red" variant="secondary" icon={RiProhibitedLine} onClick={() => setActionModal({ type: 'veto', cfip })}>Veto</Button>}
        </Flex>
      </Flex>
    </Card>
  );

  const filterByStatus = (statuses: CFIPStatus[]) => cfips.filter(c => statuses.includes(c.status));

  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl">
      <Title>CFIP Management</Title>
      <Text className="mb-6">Review and manage Community Fry Improvement Proposals</Text>
      {feedback && <Callout className="mb-4" title={feedback.type === 'success' ? 'Success' : 'Error'} color={feedback.type === 'success' ? 'teal' : 'red'}>{feedback.message}</Callout>}
      <TabGroup>
        <TabList>
          <Tab>Pending Review ({filterByStatus(['pending_review']).length})</Tab>
          <Tab>Community Voting ({filterByStatus(['community_voting']).length})</Tab>
          <Tab>Approved ({filterByStatus(['approved_for_fip']).length})</Tab>
          <Tab>Promoted ({filterByStatus(['promoted']).length})</Tab>
          <Tab>Rejected/Vetoed ({filterByStatus(['rejected', 'vetoed']).length})</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>{filterByStatus(['pending_review']).map(renderCFIPCard)}{filterByStatus(['pending_review']).length === 0 && <Text className="text-gray-500 py-8 text-center">No pending CFIPs</Text>}</TabPanel>
          <TabPanel>{filterByStatus(['community_voting']).map(renderCFIPCard)}</TabPanel>
          <TabPanel>{filterByStatus(['approved_for_fip']).map(renderCFIPCard)}</TabPanel>
          <TabPanel>{filterByStatus(['promoted']).map(renderCFIPCard)}</TabPanel>
          <TabPanel>{filterByStatus(['rejected', 'vetoed']).map(renderCFIPCard)}</TabPanel>
        </TabPanels>
      </TabGroup>

      <Dialog open={!!selectedCFIP} onClose={() => setSelectedCFIP(null)}>
        <DialogPanel className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedCFIP && (<>
            <Flex justifyContent="between" className="mb-4"><Badge color={statusColors[selectedCFIP.status]}>{statusLabels[selectedCFIP.status]}</Badge><button onClick={() => setSelectedCFIP(null)}><RiCloseLine className="h-5 w-5" /></button></Flex>
            <Title>{selectedCFIP.title}</Title>
            <Text className="text-sm text-gray-500 mb-4">Submitted by {selectedCFIP.author.discordUsername} on {new Date(selectedCFIP.created_at).toLocaleDateString()}</Text>
            <Divider />
            <div className="prose max-w-none mt-4" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(selectedCFIP.description) as string) }} />
            {selectedCFIP.admin_notes && (<><Divider /><Text className="font-semibold">Admin Notes:</Text><Text className="text-gray-600">{selectedCFIP.admin_notes}</Text></>)}
          </>)}
        </DialogPanel>
      </Dialog>

      <Dialog open={!!actionModal.type} onClose={() => setActionModal({ type: null, cfip: null })}>
        <DialogPanel className="sm:max-w-md">
          <Title className="mb-4">
            {actionModal.type === 'approve' && 'Open CFIP for Community Voting'}
            {actionModal.type === 'veto' && 'Veto CFIP'}
            {actionModal.type === 'promote' && 'Promote CFIP to Official FIP'}
            {actionModal.type === 'reject' && 'Reject CFIP'}
          </Title>
          {actionModal.cfip && <Text className="mb-4"><strong>{actionModal.cfip.title}</strong></Text>}
          {actionModal.type === 'approve' && (<div className="mb-4"><Text className="mb-2">Voting Period (days):</Text><NumberInput value={votingDays} onValueChange={setVotingDays} min={1} max={30} /></div>)}
          <div className="mb-4"><Text className="mb-2">Admin Notes (optional):</Text><TextInput value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes about this decision..." /></div>
          <Flex justifyContent="end" className="gap-2 mt-6">
            <Button variant="secondary" onClick={() => setActionModal({ type: null, cfip: null })}>Cancel</Button>
            <Button color={actionModal.type === 'veto' ? 'red' : 'blue'} onClick={handleAction} loading={loading}>Confirm</Button>
          </Flex>
        </DialogPanel>
      </Dialog>
    </main>
  );
}

export async function getServerSideProps(context: any) {
  const session = await getSession(context);
  if (!session?.user || !(session.user as any).owner) { return { redirect: { destination: '/', permanent: false } }; }
  try {
    const client = await clientPromise;
    const db = client.db('main');
    const cfips = await db.collection('cfips').find({}).sort({ created_at: -1 }).limit(100).toArray();
    return { props: { initialCFIPs: JSON.parse(JSON.stringify(cfips)) } };
  } catch (error) { console.error('Error fetching CFIPs:', error); return { props: { initialCFIPs: [] } }; }
}
