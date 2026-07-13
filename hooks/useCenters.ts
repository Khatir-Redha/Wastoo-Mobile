import { useState, useCallback } from 'react';
import CenterService, { Center, CreateCenterDTO } from '../services/center.service';

export const useCenters = () => {
  const [centers, setCenters] = useState<Center[]>([]);
  const [currentCenter, setCurrentCenter] = useState<Center | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCenter = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await CenterService.getCenter(id);
      setCurrentCenter(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch center');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createCenter = async (data: CreateCenterDTO) => {
    setLoading(true);
    setError(null);
    try {
      const newCenter = await CenterService.createCenter(data);
      setCenters((prev) => [newCenter, ...prev]);
      return newCenter;
    } catch (err: any) {
      setError(err.message || 'Failed to create center');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteCenter = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      await CenterService.deleteCenter(id);
      setCenters((prev) => prev.filter((c) => c.id !== id));
      if (currentCenter?.id === id) {
        setCurrentCenter(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete center');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    centers,
    currentCenter,
    loading,
    error,
    fetchCenter,
    createCenter,
    deleteCenter,
  };
};
