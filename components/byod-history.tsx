import { ByodUser } from '../lib/byod-schema';
import ByodHistoryTable from '../app/tables/table-byod-history';
import HistoryFilter from './history-filter';

export default function ByodHistory({ init }: { init?: any }) {
  return (
    <HistoryFilter<ByodUser>
      apiEndpoint="/api/byod-history"
      pageSize={20}
      responseDataKey="results"
      showTotalIncome
      initialData={init?.results}
      initialTotalCount={init?.totalCount}
      initialTotal={init?.totalPaymentSum}
      initialResult={init ?? undefined}
    >
      {(byodPayments) => <ByodHistoryTable byodPayments={byodPayments} />}
    </HistoryFilter>
  );
}
