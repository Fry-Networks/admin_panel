import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Card, Title, Text, Button, TextInput, NumberInput, Select, SelectItem, Badge, Divider } from '@tremor/react';

type EventStatus = 'draft' | 'active' | 'ended' | 'cancelled';
type MetricType = 'manual' | 'device_count';
type LeaderboardEntry = { wallet: string; score: number; lastCalculated?: string; source?: string };
type PrizeTier = { tier: string; description: string; type: string; amount: number; maxRank: number };
type WinnerEntry = { wallet: string; rank: number; tier: string; prizeTxId?: string; declaredAt?: string; declaredBy?: string };
type Prize = { type?: string; amount?: number; description?: string; paidTxId?: string };
type Metric = { type: MetricType; config?: Record<string, any>; lastRefreshAt?: string; lastRefreshStatus?: string; lastRefreshError?: string; nextRefreshAt?: string };
type Winner = { wallet: string; score?: number; declaredAt?: string; declaredBy?: string; prizeTxId?: string };
type Event = {
  _id: string; name: string; description?: string; status: EventStatus;
  startDate: string; endDate: string; prize?: Prize; metric: Metric;
  bannerImage?: string; ctaLink?: string; audience?: string; winner?: Winner;
  leaderboard?: LeaderboardEntry[]; prizeTiers?: PrizeTier[]; winners?: WinnerEntry[];
  waivedRequirements?: { registrationStake: boolean; minerTypes: string[] };
  created_at?: string; updated_at?: string;
};

const STATUS_COLORS: Record<EventStatus, string> = { draft: 'gray', active: 'green', ended: 'amber', cancelled: 'red' };
const STATUS_OPTIONS: EventStatus[] = ['draft', 'active', 'ended', 'cancelled'];

function getTierForRank(rank: number, tiers: PrizeTier[]): PrizeTier | null {
  const sorted = [...tiers].sort((a, b) => a.maxRank - b.maxRank);
  for (const tier of sorted) {
    if (rank <= tier.maxRank) return tier;
  }
  return null;
}

function tierColor(tier: PrizeTier): string {
  if (tier.maxRank <= 1) return 'amber';
  if (tier.maxRank <= 3) return 'blue';
  if (tier.maxRank <= 25) return 'emerald';
  if (tier.maxRank <= 50) return 'cyan';
  return 'gray';
}

export default function EventDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const eventId = typeof id === 'string' ? id : null;

  const [event, setEvent] = useState<Event | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<EventStatus>('draft');
  const [lbWallet, setLbWallet] = useState('');
  const [lbScore, setLbScore] = useState<number>(0);
  const [winnerWallet, setWinnerWallet] = useState('');
  const [winnerScore, setWinnerScore] = useState<number>(0);
  const [winnerPrizeTxId, setWinnerPrizeTxId] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [winnerTxEdits, setWinnerTxEdits] = useState<Record<number, string>>({});

  const fetchAll = async () => {
    if (!eventId) return;
    setLoading(true); setError(null);
    try {
      const [eRes, lRes] = await Promise.all([fetch(`/api/events/${eventId}`), fetch(`/api/events/${eventId}/leaderboard`)]);
      if (!eRes.ok) throw new Error(`event fetch: ${eRes.status}`);
      if (!lRes.ok) throw new Error(`leaderboard fetch: ${lRes.status}`);
      const eData = await eRes.json();
      const lData = await lRes.json();
      const ev = eData.event; if (!ev) throw new Error('missing event field');
      setEvent(ev); setNewStatus(ev.status);
      setLeaderboard(lData.leaderboard || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [eventId]);

  const handleUpdateStatus = async () => {
    if (!eventId) return; setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `failed: ${res.status}`); }
      await fetchAll();
    } catch (e: any) { setError(e.message); }
  };

  const handleUpsertLb = async () => {
    if (!eventId || !lbWallet) return; setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/leaderboard`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wallet: lbWallet.trim(), score: lbScore }) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `failed: ${res.status}`); }
      setLbWallet(''); setLbScore(0); await fetchAll();
    } catch (e: any) { setError(e.message); }
  };

  const handleRefresh = async () => {
    if (!eventId) return;
    setRefreshing(true); setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/refresh-leaderboard`, { method: 'POST' });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `refresh failed: ${res.status}`); }
      await fetchAll();
    } catch (e: any) { setError(e.message); }
    finally { setRefreshing(false); }
  };

  const handleFinalize = async () => {
    if (!eventId || !confirm(`Finalize "${event?.name}"? This will lock the leaderboard, set status to ended, and populate winners from prize tiers.`)) return;
    setFinalizing(true); setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/finalize`, { method: 'POST' });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `finalize failed: ${res.status}`); }
      const data = await res.json();
      alert(`Competition finalized. ${data.winnersCount} winners assigned.`);
      await fetchAll();
    } catch (e: any) { setError(e.message); }
    finally { setFinalizing(false); }
  };

  const handleDeclareWinner = async () => {
    if (!eventId || !winnerWallet) { setError('Wallet required'); return; }
    if (!confirm(`Declare ${winnerWallet} as winner?`)) return;
    setError(null);
    try {
      const body: any = { wallet: winnerWallet.trim() };
      if (winnerScore > 0) body.score = winnerScore;
      if (winnerPrizeTxId.trim()) body.prizeTxId = winnerPrizeTxId.trim();
      const res = await fetch(`/api/events/${eventId}/declare-winner`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `failed: ${res.status}`); }
      setWinnerWallet(''); setWinnerScore(0); setWinnerPrizeTxId(''); await fetchAll();
    } catch (e: any) { setError(e.message); }
  };

  const handleSaveWinnerTxId = async (idx: number, txId: string) => {
    if (!eventId || !event?.winners) return;
    setError(null);
    try {
      const updatedWinners = event.winners.map((w, i) => i === idx ? { ...w, prizeTxId: txId } : w);
      const res = await fetch(`/api/events/${eventId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ winners: updatedWinners }) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `failed: ${res.status}`); }
      await fetchAll();
    } catch (e: any) { setError(e.message); }
  };

  const handleCancel = async () => {
    if (!eventId || !confirm(`Cancel "${event?.name}"?`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`failed: ${res.status}`);
      await fetchAll();
    } catch (e: any) { setError(e.message); }
  };

  if (loading) return <main className="p-4 md:p-10 mx-auto max-w-7xl bg-gray-950 min-h-screen"><Text className="text-gray-400">Loading...</Text></main>;
  if (!event) return <main className="p-4 md:p-10 mx-auto max-w-7xl bg-gray-950 min-h-screen"><Link href="/events" className="text-gray-400 hover:text-white text-sm">&larr; Back</Link><Text className="text-red-400 mt-4">Event not found.</Text></main>;

  const sortedLb = leaderboard.slice().sort((a, b) => b.score - a.score);
  const isManual = event.metric?.type === 'manual';
  const hasPrizeTiers = (event.prizeTiers?.length ?? 0) > 0;
  const hasWinners = (event.winners?.length ?? 0) > 0;

  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl bg-gray-950 min-h-screen">
      <Link href="/events" className="text-gray-400 hover:text-white text-sm">&larr; Back to events</Link>
      <div className="flex items-start justify-between gap-3 mt-4">
        <div className="flex-1 min-w-0"><Title className="text-white">{event.name}</Title>{event.description && <Text className="text-gray-400 mt-1">{event.description}</Text>}</div>
        <Badge color={(STATUS_COLORS[event.status] || 'gray') as any}>{event.status}</Badge>
      </div>

      {/* Details */}
      <Card className="bg-gray-900 border-gray-700 mt-6">
        <Title className="text-white">Details</Title>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
          <div><Text className="text-gray-500">Status</Text><Text className="text-white">{event.status}</Text></div>
          <div><Text className="text-gray-500">Metric</Text><Text className="text-white">{event.metric?.type || '\u2014'}</Text></div>
          <div><Text className="text-gray-500">Start</Text><Text className="text-white">{event.startDate ? new Date(event.startDate).toLocaleString() : '\u2014'}</Text></div>
          <div><Text className="text-gray-500">End</Text><Text className="text-white">{event.endDate ? new Date(event.endDate).toLocaleString() : '\u2014'}</Text></div>
          {event.prize && <div className="md:col-span-2"><Text className="text-gray-500">Prize (legacy)</Text><Text className="text-white">{event.prize.amount ?? '\u2014'} {event.prize.type || ''}{event.prize.description && ` \u2014 ${event.prize.description}`}</Text></div>}
          {event.audience && <div><Text className="text-gray-500">Audience</Text><Text className="text-white">{event.audience}</Text></div>}
          {event.waivedRequirements?.registrationStake && (
            <div className="md:col-span-2"><Text className="text-gray-500">Waived Requirements</Text><Text className="text-white">Registration stake waived for: {event.waivedRequirements.minerTypes?.join(', ') || 'none'}</Text></div>
          )}
          {event.winner && <div className="md:col-span-2 border-t border-gray-700 pt-4 mt-2"><Text className="text-gray-500">Legacy Winner</Text><Text className="text-white font-mono text-xs break-all">{event.winner.wallet}</Text>{typeof event.winner.score === 'number' && <Text className="text-gray-400 text-sm mt-1">Score: {event.winner.score}</Text>}{event.winner.prizeTxId && <Text className="text-gray-500 text-xs font-mono mt-1">prizeTxId: {event.winner.prizeTxId}</Text>}</div>}
        </div>
      </Card>

      {/* Prize Tiers */}
      {hasPrizeTiers && (
        <Card className="bg-gray-900 border-gray-700 mt-6">
          <Title className="text-white">Prize Tiers</Title>
          <div className="mt-4 space-y-2">
            {event.prizeTiers!.sort((a, b) => a.maxRank - b.maxRank).map((tier, i) => (
              <div key={i} className="flex items-center justify-between gap-3 border border-gray-700 rounded p-3">
                <div className="flex items-center gap-3">
                  <Badge color={tierColor(tier) as any}>{tier.tier}</Badge>
                  <Text className="text-white">{tier.description}</Text>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span>{tier.amount} {tier.type}</span>
                  <span>Rank ≤ {tier.maxRank}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Refresh Controls */}
      {!isManual && (
        <Card className="bg-gray-900 border-gray-700 mt-6">
          <Title className="text-white">Leaderboard Refresh</Title>
          <div className="flex items-end gap-3 mt-4">
            <Button onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? 'Refreshing...' : 'Refresh Now'}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
            <div><Text className="text-gray-500">Last Refresh</Text><Text className="text-white">{event.metric?.lastRefreshAt ? new Date(event.metric.lastRefreshAt).toLocaleString() : 'Never'}</Text></div>
            <div><Text className="text-gray-500">Status</Text><Text className={event.metric?.lastRefreshStatus === 'ok' ? 'text-green-400' : event.metric?.lastRefreshStatus === 'failed' ? 'text-red-400' : 'text-gray-400'}>{event.metric?.lastRefreshStatus || '\u2014'}</Text></div>
            <div><Text className="text-gray-500">Next Refresh</Text><Text className="text-white">{event.metric?.nextRefreshAt ? new Date(event.metric.nextRefreshAt).toLocaleString() : '\u2014'}</Text></div>
          </div>
          {event.metric?.lastRefreshError && <Text className="text-red-400 text-sm mt-2">Error: {event.metric.lastRefreshError}</Text>}
        </Card>
      )}

      <Card className="bg-gray-900 border-gray-700 mt-6">
        <Title className="text-white">Update Status</Title>
        <div className="flex items-end gap-3 mt-4">
          <Select value={newStatus} onValueChange={(v: any) => setNewStatus(v as EventStatus)} className="max-w-xs">{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</Select>
          <Button onClick={handleUpdateStatus} disabled={newStatus === event.status}>Update</Button>
        </div>
      </Card>

      {/* Leaderboard */}
      <Card className="bg-gray-900 border-gray-700 mt-6">
        <Title className="text-white">Leaderboard</Title>
        {isManual && <Text className="text-gray-400 text-sm mt-1">Manual upsert (metric.type=manual)</Text>}
        {!isManual && <Text className="text-gray-400 text-sm mt-1">Auto-refreshed. Manual upsert disabled.</Text>}
        {isManual && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <TextInput placeholder="Wallet *" value={lbWallet} onValueChange={setLbWallet} />
            <NumberInput placeholder="Score" value={lbScore} onValueChange={(v: any) => setLbScore(typeof v === 'number' ? v : Number(v) || 0)} />
            <Button onClick={handleUpsertLb} disabled={!lbWallet}>Upsert</Button>
          </div>
        )}
        <Divider className="my-4" />
        {sortedLb.length === 0 ? <Text className="text-gray-400">No entries.</Text> : (
          <div className="space-y-2">{sortedLb.map((e, i) => {
            const rank = i + 1;
            const tier = hasPrizeTiers ? getTierForRank(rank, event.prizeTiers!) : null;
            return (
              <div key={e.wallet} className="flex items-center justify-between gap-3 border border-gray-700 rounded p-3">
                <div className="min-w-0 flex-1">
                  <Text className="text-white">#{rank}</Text>
                  <Text className="text-gray-400 text-xs font-mono break-all">{e.wallet}</Text>
                </div>
                <div className="flex items-center gap-3">
                  <Text className="text-white font-semibold text-lg">{e.score}</Text>
                  {tier && <Badge color={tierColor(tier) as any}>{tier.tier}</Badge>}
                  {e.source && <Badge color="gray">{e.source}</Badge>}
                  {isManual && <Button size="xs" variant="secondary" onClick={() => { setLbWallet(e.wallet); setLbScore(e.score); }}>Edit</Button>}
                </div>
              </div>
            );
          })}</div>
        )}
      </Card>

      {/* Finalize Competition (multi-tier) */}
      {hasPrizeTiers && event.status === 'active' && (
        <Card className="bg-gray-900 border-blue-700 mt-6">
          <Title className="text-white">Finalize Competition</Title>
          <Text className="text-gray-400 text-sm mt-1">Locks leaderboard, sets status to ended, and maps rankings to prize tiers.</Text>
          <div className="mt-4">
            <Button color="blue" onClick={handleFinalize} disabled={finalizing || sortedLb.length === 0}>
              {finalizing ? 'Finalizing...' : 'Finalize Competition'}
            </Button>
          </div>
        </Card>
      )}

      {/* Winners (multi-tier) */}
      {hasWinners && (
        <Card className="bg-gray-900 border-gray-700 mt-6">
          <Title className="text-white">Winners ({event.winners!.length})</Title>
          <div className="mt-4 space-y-2">
            {event.winners!.map((w, idx) => (
              <div key={`${w.wallet}-${idx}`} className="border border-gray-700 rounded p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Text className="text-white font-semibold">#{w.rank}</Text>
                      <Badge color="amber">{w.tier}</Badge>
                    </div>
                    <Text className="text-gray-400 text-xs font-mono break-all mt-1">{w.wallet}</Text>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <TextInput
                    placeholder="prizeTxId"
                    value={winnerTxEdits[idx] ?? w.prizeTxId ?? ''}
                    onValueChange={v => setWinnerTxEdits(prev => ({ ...prev, [idx]: v }))}
                    className="flex-1"
                  />
                  <Button size="xs" onClick={() => handleSaveWinnerTxId(idx, winnerTxEdits[idx] ?? w.prizeTxId ?? '')}
                    disabled={!(winnerTxEdits[idx] !== undefined && winnerTxEdits[idx] !== (w.prizeTxId ?? ''))}>
                    Save
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Legacy single winner declaration */}
      {!hasPrizeTiers && (
        <Card className="bg-gray-900 border-gray-700 mt-6">
          <Title className="text-white">Declare Winner (Legacy)</Title>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <TextInput placeholder="Winner wallet *" value={winnerWallet} onValueChange={setWinnerWallet} />
            <NumberInput placeholder="Score (optional)" value={winnerScore} onValueChange={(v: any) => setWinnerScore(typeof v === 'number' ? v : Number(v) || 0)} />
            <TextInput placeholder="PrizeTxId (optional)" value={winnerPrizeTxId} onValueChange={setWinnerPrizeTxId} />
          </div>
          {sortedLb.length > 0 && <div className="flex flex-wrap gap-2 mt-3"><Text className="text-gray-500 text-xs w-full">Quick-select:</Text>{sortedLb.slice(0,5).map(e => <Button key={e.wallet} size="xs" variant="secondary" onClick={() => { setWinnerWallet(e.wallet); setWinnerScore(e.score); }}>{e.wallet.slice(0,8)}...({e.score})</Button>)}</div>}
          <div className="mt-4"><Button onClick={handleDeclareWinner} disabled={!winnerWallet}>Declare Winner</Button></div>
        </Card>
      )}

      {/* Danger Zone */}
      <Card className="bg-gray-900 border-red-900 mt-6">
        <Title className="text-white">Danger Zone</Title>
        <div className="flex items-center justify-between gap-3 mt-3">
          <Text className="text-gray-400">Soft-cancel (status=cancelled). Data remains.</Text>
          <Button color="red" onClick={handleCancel} disabled={event.status === 'cancelled'}>Cancel Event</Button>
        </div>
      </Card>

      {error && <Card className="bg-red-950 border-red-700 mt-6"><Text className="text-red-300">{error}</Text></Card>}
    </main>
  );
}
