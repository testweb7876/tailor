import { useCallback, useEffect, useState } from 'react';
import api, { msg } from '../services/api';
import { useToast } from '../components/Toast';

/*
 * Generic list loader:
 * GET `url` with { page, limit, ...params }
 * Empty/null/undefined params are removed before sending.
 *
 * Returns:
 * { data, meta, loading, page, setPage, reload }
 */
export default function usePaginatedList(url, params = {}, deps = []) {
  const toast = useToast();

  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(
          ([, value]) =>
            value !== '' &&
            value !== null &&
            value !== undefined
        )
      );

      const { data: res } = await api.get(url, {
        params: {
          page,
          limit: 20,
          ...cleanParams,
        },
      });

      setData(res.data || []);
      setMeta(res.meta || null);
    } catch (e) {
      console.error('Failed to load paginated list:', e);
      toast.error(msg(e, 'Failed to load'));
    } finally {
      setLoading(false);
    }
  }, [url, page, JSON.stringify(params)]); // eslint-disable-line

  useEffect(() => {
    load();
  }, [load, ...deps]); // eslint-disable-line

  return {
    data,
    meta,
    loading,
    page,
    setPage,
    reload: load,
  };
}