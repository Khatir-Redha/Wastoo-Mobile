import { useState, useCallback } from 'react';
import PickupService, { Pickup, CreatePickupDto, UpdatePickupDto } from '../services/pickup.service';

export const usePickups = () => {
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllPickups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await PickupService.getAllPickups();
      setPickups(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pickups');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyPickups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await PickupService.getMyPickups();
      setPickups(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch my pickups');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createPickup = async (data: CreatePickupDto) => {
    setLoading(true);
    setError(null);
    try {
      const newPickup = await PickupService.createPickup(data);
      setPickups((prev) => [newPickup, ...prev]);
      return newPickup;
    } catch (err: any) {
      setError(err.message || 'Failed to create pickup');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updatePickup = async (id: number, data: UpdatePickupDto) => {
    setLoading(true);
    setError(null);
    try {
      const updatedPickup = await PickupService.updatePickup(id, data);
      setPickups((prev) => prev.map((p) => (p.id === id ? updatedPickup : p)));
      return updatedPickup;
    } catch (err: any) {
      setError(err.message || 'Failed to update pickup');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const assignCollector = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const updatedPickup = await PickupService.assignCollector(id);
      setPickups((prev) => prev.map((p) => (p.id === id ? updatedPickup : p)));
      return updatedPickup;
    } catch (err: any) {
      setError(err.message || 'Failed to assign collector');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const updatedPickup = await PickupService.updateStatus(id);
      setPickups((prev) => prev.map((p) => (p.id === id ? updatedPickup : p)));
      return updatedPickup;
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deletePickup = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      await PickupService.deletePickup(id);
      setPickups((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete pickup');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    pickups,
    loading,
    error,
    fetchAllPickups,
    fetchMyPickups,
    createPickup,
    updatePickup,
    assignCollector,
    updateStatus,
    deletePickup,
  };
};
