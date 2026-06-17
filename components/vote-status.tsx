import {
  Button,
  Dialog,
  DialogPanel,
  Flex,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Title
} from '@tremor/react';
import { useMemo } from 'react';
import Modal from 'react-modal';

export default function ModalVoteStatus({
  isOpen,
  setIsOpen,
  stakeInfo,
  vote
}: {
  isOpen: boolean;
  setIsOpen: Function;
  stakeInfo: any[];
  vote?: { title?: string; votes?: { title?: string }[] };
}) {
  const grouped = useMemo(() => {
    if (!Array.isArray(stakeInfo)) return {};
    const groups: Record<string, any[]> = {};
    for (const stake of stakeInfo) {
      const key = stake.voteOption ?? 'unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(stake);
    }
    return groups;
  }, [stakeInfo]);

  const formatNumber = (n: any) => {
    const num = Number(n);
    if (isNaN(num)) return 'N/A';
    return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 6 });
  };

  const truncateAddress = (addr: string) => {
    if (!addr || addr.length < 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getAmount = (info: any): number | undefined => {
    // V2 on-chain path: amount is tokenAmount string in microalgos
    if (info.onChain && info.amount !== undefined) {
      try {
        const raw = BigInt(info.amount);
        return Number(raw) / 1e6;
      } catch {
        return Number(info.amount) / 1e6;
      }
    }
    // V1 MongoDB path
    if (info.stakes !== undefined) return Number(info.stakes);
    if (info.votes !== undefined) return Number(info.votes);
    if (info.amount !== undefined) return Number(info.amount);
    return undefined;
  };

  return (
    <Modal
      isOpen={isOpen}
      closeTimeoutMS={500}
      style={customStyles}
      contentLabel="Vote Status"
    >
      <div className="max-h-[700px] overflow-auto">
        <Flex flexDirection="row-reverse">
          <Button onClick={() => setIsOpen()}>X</Button>
        </Flex>
        <h2 className="mt-2 text-center text-xl font-bold text-white">
          Vote State: {vote?.title || 'Vote'}
        </h2>
        <div className="flex flex-wrap mt-4 gap-4 items-start">
          {Object.entries(grouped).map(([optionKey, optionStakes]) => {
            const optionTitle =
              vote?.votes?.[parseInt(optionKey)]?.title || `Option ${parseInt(optionKey) + 1}`;
            const totalFry = optionStakes.reduce((sum, info) => {
              const amt = getAmount(info);
              return sum + (amt && !isNaN(amt) ? amt : 0);
            }, 0);

            return (
              <div key={optionKey} className="flex-1 min-w-[280px]">
                <h3 className="text-base font-bold text-white">
                  {optionTitle}
                </h3>
                <p className="text-sm text-gray-400 mb-2">
                  {optionStakes.length} voter{optionStakes.length !== 1 ? 's' : ''}, {formatNumber(totalFry)} FRY staked
                </p>
                {optionStakes.length === 0 ? (
                  <p className="text-sm text-gray-400">No votes</p>
                ) : (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell className="text-gray-200">Wallet Address</TableHeaderCell>
                        <TableHeaderCell className="text-gray-200 text-right">FRY Staked</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {optionStakes.map((info, index) => (
                        <TableRow key={index}>
                          <TableCell className="text-gray-100" title={info.address}>
                            {truncateAddress(info.address)}
                          </TableCell>
                          <TableCell className="text-gray-100 text-right">
                            {formatNumber(getAmount(info))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            );
          })}
          {Object.keys(grouped).length === 0 && (
            <p className="text-gray-400">No stake data available</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

const customStyles = {
  content: {
    backgroundColor: '#111827',
    color: '#f9fafb',
    borderColor: '#374151',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
    minWidth: '320px'
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)'
  }
};
