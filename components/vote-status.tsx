import {
  Button,
  Flex,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Title
} from '@tremor/react';
import Modal from 'react-modal';

type OptionMeta = { option: string; title?: string; votes?: number; people?: number };
type OnChainState = {
  available: boolean;
  reason?: string;
  appId?: number;
  tokens?: string[];
  voters?: string[];
  perOption?: Record<string, string[]>;
  divergence?: boolean;
} | null;

export default function ModalVoteStatus({
  isOpen,
  setIsOpen,
  stakeInfo,
  options = [],
  onChain = null
}: {
  isOpen: boolean;
  setIsOpen: Function;
  stakeInfo: any[];
  options?: OptionMeta[];
  onChain?: OnChainState;
}) {
  // Prefer explicit option metadata (supports 2-8 options); fall back to
  // whatever option keys appear in the rows for legacy payloads.
  const optionKeys: string[] =
    options.length > 0
      ? options.map((o) => o.option)
      : Array.from(new Set((stakeInfo ?? []).map((s: any) => String(s.voteOption)))).sort();

  const titleFor = (key: string, idx: number) => {
    const meta = options.find((o) => o.option === key);
    return meta?.title ? `Option ${idx + 1}: ${meta.title}` : `Option ${idx + 1}`;
  };
  const rowsFor = (key: string) => (stakeInfo ?? []).filter((s: any) => String(s.voteOption) === key);
  const chainFor = (key: string) => (onChain?.available ? onChain.perOption?.[key] ?? [] : []);
  const chainOnlyFor = (key: string) => {
    const rows = rowsFor(key);
    return chainFor(key).filter((addr) => !rows.some((r: any) => r.address === addr));
  };
  const fryFor = (idx: number) => {
    const raw = Number(onChain?.tokens?.[idx] ?? 0);
    return (raw / 1e6).toLocaleString();
  };

  return (
    <Modal
      isOpen={isOpen}
      closeTimeoutMS={500}
      style={customStyles}
      contentLabel="Vote state"
    >
      <div className="max-h-[700px] overflow-auto">
        <Flex flexDirection="row-reverse">
          <Button onClick={() => setIsOpen()}>X</Button>
        </Flex>
        {onChain && (
          <div className="mt-2 text-sm" style={{ color: '#9ca3af' }}>
            {onChain.available ? (
              <span>
                On-chain (app {onChain.appId}):{' '}
                {optionKeys
                  .map((k, i) => `opt ${i + 1}: ${fryFor(i)} FRY / ${onChain.voters?.[i] ?? '0'} voters`)
                  .join('  |  ')}
                {onChain.divergence ? (
                  <strong style={{ color: '#f59e0b' }}> — roster DIVERGES from Mongo</strong>
                ) : (
                  <span> — matches Mongo roster</span>
                )}
              </span>
            ) : (
              <span>On-chain state unavailable: {onChain.reason}</span>
            )}
          </div>
        )}
        <Flex className="mt-2 gap-2 flex-wrap" alignItems="start">
          {optionKeys.map((key, idx) => (
            <div key={key} style={{ minWidth: '320px', flex: 1 }}>
              <Title>{titleFor(key, idx)}</Title>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Address</TableHeaderCell>
                    <TableHeaderCell>Votes</TableHeaderCell>
                    <TableHeaderCell>Stakes</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rowsFor(key).map((info: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{info.address}</TableCell>
                      <TableCell>{info.missing ? '—' : info.votes}</TableCell>
                      <TableCell>{info.missing ? 'no stake record' : info.stakes}</TableCell>
                    </TableRow>
                  ))}
                  {chainOnlyFor(key).map((addr: string, index: number) => (
                    <TableRow key={`chain-${index}`}>
                      <TableCell>{addr}</TableCell>
                      <TableCell>on-chain only</TableCell>
                      <TableCell>—</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </Flex>
      </div>
    </Modal>
  );
}

const customStyles = {
  content: {
    backgroundColor: '#111827', // Example background color
    color: '#f9fafb', borderColor: '#374151',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
    minWidth: '320px'
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)' // Example overlay color
  }
};
