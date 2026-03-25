import { GasFee } from '../lib/gasfee-schema';
import GasFeeTable from '../app/tables/table-gasfee';
import HistoryFilter from './history-filter';

export default function FryWorldHistory() {
  return (
    <HistoryFilter<GasFee>
      apiEndpoint="/api/gasfee-history"
      pageSize={20}
      responseDataKey="gasFees"
      showTotalIncome
    >
      {(gasFees) => <GasFeeTable gasFees={gasFees} />}
    </HistoryFilter>
  );
}
