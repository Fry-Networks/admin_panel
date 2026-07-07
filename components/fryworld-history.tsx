'use client';

import { useState } from 'react';
import { GasFee } from '../lib/gasfee-schema';
import GasFeeTable from '../app/tables/table-gasfee';
import HistoryFilter from './history-filter';

export default function FryWorldHistory({ init }: { init?: any }) {
  const [fryPrice, setFryPrice] = useState(init?.fryPrice ?? 0);

  return (
    <HistoryFilter<GasFee>
      apiEndpoint="/api/gasfee-history"
      pageSize={20}
      responseDataKey="gasFees"
      showTotalIncome
      initialData={init?.gasFees}
      initialTotalCount={init?.totalCount}
      initialTotal={init?.totalPaymentSum}
      initialResult={init ?? undefined}
      onDataLoaded={(result) => {
        if (result.fryPrice !== undefined) {
          setFryPrice(result.fryPrice);
        }
      }}
    >
      {(gasFees) => <GasFeeTable gasFees={gasFees} fryPrice={fryPrice} />}
    </HistoryFilter>
  );
}
