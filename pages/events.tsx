import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, Title, Text, Button, TextInput, NumberInput, Select, SelectItem, Badge } from '@tremor/react';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
type EventStatus = 'draft' | 'active' | 'ended' | 'cancelled';
type MetricType = 'manual' | 'aem_count' | 'device_count';
type PrizeTier = { tier: string; description: string; type: string; amount: number; maxRank: number };
type Prize = { type?: string; amount?: number; description?: string; paidTxId?: string };
type Metric = { type: MetricType; config?: Record<string, any> };
type Winner = { wallet: string; score?: number; prizeTxId?: string };
type Event = {
  _id: string; name: string; description?: string; status: EventStatus;
  startDate: string; endDate: string; prize?: Prize; metric: Metric;
  bannerImage?: string; ctaLink?: string; audience?: string; winner?: Winner;
  prizeTiers?: PrizeTier[]; winners?: any[]; waivedRequirements?: { registrationStake: boolean; minerTypes: string[] };
  created_at?: string; updated_at?: string;
};

const STATUS_COLORS: Record<EventStatus, string> = { draft: 'gray', active: 'green', ended: 'amber', cancelled: 'red' };
const STATUS_OPTIONS: EventStatus[] = ['draft', 'active', 'ended', 'cancelled'];
const METRIC_OPTIONS: MetricType[] = ['manual', 'aem_count', 'device_count'];
const MINER_TYPE_OPTIONS = ['AEM', 'SDN', 'RDN', 'BM', 'EM', 'AOWSCM', 'OLWQM', 'OHWQM', 'IDM', 'ODM'];
const PRIZE_TYPE_OPTIONS = ['USDC', 'NFT', 'key', 'token', 'other'];

const emptyTier = (): PrizeTier => ({ tier: '', description: '', type: 'USDC', amount: 0, maxRank: 1 });

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<EventStatus>('draft');
  const [metricType, setMetricType] = useState<MetricType>('manual');
  const [prizeType, setPrizeType] = useState('USDC');
  const [prizeAmount, setPrizeAmount] = useState<number>(0);
  const [prizeDescription, setPrizeDescription] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [ctaLink, setCtaLink] = useState('');
  const [audience, setAudience] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // New fields
  const [prizeTiers, setPrizeTiers] = useState<PrizeTier[]>([]);
  const [waiveRegistration, setWaiveRegistration] = useState(false);
  const [waivedMinerTypes, setWaivedMinerTypes] = useState<string[]>([]);
  const [refreshIntervalMinutes, setRefreshIntervalMinutes] = useState<number>(60);

  const fetchEvents = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/events');
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
      const data = await res.json();
      setEvents(data.events || []);
    } catch (e: any) { setError(e.message || 'Failed to load'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchEvents(); }, []);

  const addTier = () => setPrizeTiers([...prizeTiers, emptyTier()]);
  const removeTier = (idx: number) => setPrizeTiers(prizeTiers.filter((_, i) => i !== idx));
  const updateTier = (idx: number, field: keyof PrizeTier, value: string | number) => {
    const next = [...prizeTiers];
    (next[idx] as any)[field] = value;
    setPrizeTiers(next);
  };

  const toggleMinerType = (mt: string) => {
    setWaivedMinerTypes(prev => prev.includes(mt) ? prev.filter(t => t !== mt) : [...prev, mt]);
  };

  const handleCreate = async () => {
    setSubmitting(true); setError(null);
    try {
      const body: any = {
        name, startDate, endDate, status,
        metric: { type: metricType },
        refreshIntervalMinutes,
      };
      if (description) body.description = description;
      if (prizeAmount > 0 || prizeType.trim()) {
        body.prize = {
          type: prizeType.trim() || undefined,
          amount: prizeAmount,
          description: prizeDescription.trim() || undefined,
        };
      }
      if (bannerImage.trim()) body.bannerImage = bannerImage.trim();
      if (ctaLink.trim()) body.ctaLink = ctaLink.trim();
      if (audience.trim()) body.audience = audience.trim();
      if (prizeTiers.length > 0) {
        body.prizeTiers = prizeTiers.filter(t => t.tier.trim() && t.maxRank > 0);
      }
      if (waiveRegistration && waivedMinerTypes.length > 0) {
        body.waivedRequirements = {
          registrationStake: true,
          minerTypes: waivedMinerTypes,
        };
      }
      const res = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `create failed: ${res.status}`); }
      // Reset form
      setName(''); setDescription(''); setStartDate(''); setEndDate(''); setStatus('draft'); setMetricType('manual');
      setPrizeType('USDC'); setPrizeAmount(0); setPrizeDescription(''); setBannerImage(''); setCtaLink(''); setAudience('');
      setPrizeTiers([]); setWaiveRegistration(false); setWaivedMinerTypes([]); setRefreshIntervalMinutes(60);
      await fetchEvents();
    } catch (e: any) { setError(e.message || 'Create failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl bg-gray-950 min-h-screen">
      <Title className="text-white">Events</Title>
      <Text className="text-gray-400 mt-2">Manage events, competitions, and leaderboards.</Text>

      <Card className="bg-gray-900 border-gray-700 mt-6">
        <Title className="text-white">Create Event</Title>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <TextInput placeholder="Event name *" value={name} onValueChange={setName} />
          <Select value={status} onValueChange={(v: any) => setStatus(v as EventStatus)}>
            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </Select>
          <TextInput placeholder="Description" value={description} onValueChange={setDescription} className="md:col-span-2" />
          <div>
            <Text className="text-gray-400 text-xs mb-1">Start date *</Text>
            <DatePicker
              selected={startDate ? new Date(startDate) : null}
              onChange={(d: Date | null) => setStartDate(d ? d.toISOString() : '')}
              showTimeSelect timeFormat="HH:mm" timeIntervals={15} dateFormat="yyyy-MM-dd HH:mm"
              placeholderText="Select start date and time" required wrapperClassName="w-full"
              className="w-full bg-gray-950 border border-gray-700 rounded-md px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <Text className="text-gray-400 text-xs mb-1">End date *</Text>
            <DatePicker
              selected={endDate ? new Date(endDate) : null}
              onChange={(d: Date | null) => setEndDate(d ? d.toISOString() : '')}
              showTimeSelect timeFormat="HH:mm" timeIntervals={15} dateFormat="yyyy-MM-dd HH:mm"
              placeholderText="Select end date and time" required wrapperClassName="w-full"
              className="w-full bg-gray-950 border border-gray-700 rounded-md px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Select value={metricType} onValueChange={(v: any) => setMetricType(v as MetricType)}>
            {METRIC_OPTIONS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </Select>
          <TextInput placeholder="Audience" value={audience} onValueChange={setAudience} />
          <TextInput placeholder="Prize type (e.g. USDC)" value={prizeType} onValueChange={setPrizeType} />
          <NumberInput placeholder="Prize amount" value={prizeAmount} onValueChange={(v: any) => setPrizeAmount(typeof v === 'number' ? v : Number(v) || 0)} />
          <TextInput placeholder="Prize description" value={prizeDescription} onValueChange={setPrizeDescription} className="md:col-span-2" />
          <TextInput placeholder="Banner image URL" value={bannerImage} onValueChange={setBannerImage} />
          <TextInput placeholder="CTA link" value={ctaLink} onValueChange={setCtaLink} />
          {metricType !== 'manual' && (
            <NumberInput
              placeholder="Refresh interval (minutes)"
              value={refreshIntervalMinutes}
              onValueChange={(v: any) => setRefreshIntervalMinutes(typeof v === 'number' ? v : Number(v) || 60)}
            />
          )}
        </div>

        {/* Prize Tiers */}
        <div className="mt-6 border-t border-gray-700 pt-4">
          <div className="flex items-center justify-between">
            <Text className="text-white font-semibold">Prize Tiers</Text>
            <Button size="xs" onClick={addTier}>+ Add Tier</Button>
          </div>
          {prizeTiers.map((tier, idx) => (
            <div key={idx} className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-2 items-end">
              <TextInput placeholder="Tier (e.g. 1st)" value={tier.tier} onValueChange={v => updateTier(idx, 'tier', v)} />
              <TextInput placeholder="Description" value={tier.description} onValueChange={v => updateTier(idx, 'description', v)} />
              <Select value={tier.type} onValueChange={(v: any) => updateTier(idx, 'type', v)}>
                {PRIZE_TYPE_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </Select>
              <NumberInput placeholder="Amount" value={tier.amount} onValueChange={(v: any) => updateTier(idx, 'amount', typeof v === 'number' ? v : Number(v) || 0)} />
              <NumberInput placeholder="Max rank" value={tier.maxRank} onValueChange={(v: any) => updateTier(idx, 'maxRank', typeof v === 'number' ? v : Number(v) || 1)} />
              <Button size="xs" color="red" onClick={() => removeTier(idx)}>Remove</Button>
            </div>
          ))}
        </div>

        {/* Waived Requirements */}
        <div className="mt-6 border-t border-gray-700 pt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={waiveRegistration} onChange={e => setWaiveRegistration(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-800" />
            <Text className="text-white">Waive registration stake during this event</Text>
          </label>
          {waiveRegistration && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Text className="text-gray-400 text-xs w-full">Waived miner types:</Text>
              {MINER_TYPE_OPTIONS.map(mt => (
                <button key={mt} type="button" onClick={() => toggleMinerType(mt)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                    waivedMinerTypes.includes(mt)
                      ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                      : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500'
                  }`}>
                  {mt}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4">
          <Button onClick={handleCreate} disabled={submitting || !name || !startDate || !endDate}>
            {submitting ? 'Creating...' : 'Create Event'}
          </Button>
        </div>
        {error && <Text className="text-red-400 mt-3">{error}</Text>}
      </Card>

      <Card className="bg-gray-900 border-gray-700 mt-6">
        <Title className="text-white">All Events</Title>
        {loading ? <Text className="text-gray-400 mt-4">Loading...</Text> : events.length === 0 ? <Text className="text-gray-400 mt-4">No events yet.</Text> : (
          <div className="mt-4 space-y-3">{events.map((event) => (
            <Link key={event._id} href={`/events/${event._id}`} className="block">
              <div className="border border-gray-700 rounded-lg p-4 hover:border-gray-500 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Text className="text-white font-semibold truncate">{event.name}</Text>
                    {event.description && <Text className="text-gray-400 text-sm mt-1 truncate">{event.description}</Text>}
                  </div>
                  <Badge color={(STATUS_COLORS[event.status] || 'gray') as any}>{event.status}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-gray-400">
                  {event.prize && typeof event.prize.amount === 'number' && <span>Prize: {event.prize.amount} {event.prize.type || ''}</span>}
                  {event.metric && <span>Metric: {event.metric.type}</span>}
                  {event.prizeTiers && event.prizeTiers.length > 0 && <span>{event.prizeTiers.length} prize tiers</span>}
                  {event.waivedRequirements?.registrationStake && <Badge color="blue">Stake waived</Badge>}
                  {event.startDate && event.endDate && <span>{new Date(event.startDate).toLocaleDateString()} → {new Date(event.endDate).toLocaleDateString()}</span>}
                </div>
              </div>
            </Link>
          ))}</div>
        )}
      </Card>
    </main>
  );
}
