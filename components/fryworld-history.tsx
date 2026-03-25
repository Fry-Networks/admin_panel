import { FryToken } from '../lib/tokens-schema';
import { FryWrold } from '../lib/fryworld-schema';
import FryWorldHistoryTable from '../app/tables/table-fryworld-history';
import HistoryFilter from './history-filter';

export default function FryWorldHistory({ tokens }: { tokens: FryToken[] }) {
  return (
    <HistoryFilter<FryWrold>
      apiEndpoint="/api/fryworld-history"
      pageSize={20}
      responseDataKey="fryworldPayments"
      showTotalIncome
    >
      {(payments) => (
        <FryWorldHistoryTable fryworldPayments={payments} tokens={tokens} />
      )}
    </HistoryFilter>
  );
}
