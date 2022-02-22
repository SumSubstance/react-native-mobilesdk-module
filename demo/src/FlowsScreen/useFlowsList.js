import { useApiClient } from '../LoginContext';
import { useState, useEffect } from 'react';

/** @typedef {import('../LoginContext/api').ApiClient} ApiClient */

export function useFlowsList() {
  const apiClient = useApiClient();
  const [loading, setLoading] = useState(false);
  const [flowList, setFlowList] = useState([]);
  const [levelList, setLevelList] = useState([]);
  useEffect(() => {
    async function fetchFlowList() {
      setLoading(true);
      try {
        const flows = await apiClient.fetchFlows();
        const levels = await apiClient.fetchLevels();
        setLevelList(levels.list.items.map((item) => {
          let flow = flows.list.items.find((item) => item.id === item.msdkFlowId);
          if (flow) {
            item.flowType = flow.type;
          }
          return item;
        }));
        setFlowList(flows.list.items.filter((item) => item.target === 'msdk'));
      } finally {
        setLoading(false);
      }
    }

    if (apiClient) {
      fetchFlowList();
    } else {
      setFlowList([]);
    }
  }, [apiClient]);

  return [flowList, levelList, loading];
}
