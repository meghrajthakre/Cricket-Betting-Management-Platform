import { useCallback, useEffect, useState } from "react";
import { deleteAdmin, getAdmins, toggleAdminStatus } from "../api/adminApi";
import { PAGE_SIZE } from "../constants/adminFormConstants";

export default function useAdmins({ page, searchQuery, showToast }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAdmins() {
      setLoading(true);
      try {
        const response = await getAdmins(
          { page, limit: PAGE_SIZE, search: searchQuery },
          controller.signal
        );
        if (controller.signal.aborted) return;
        setAdmins(Array.isArray(response.data) ? response.data : []);
        setTotalPages(Math.max(1, Number(response.pagination?.pages ?? 1)));
      } catch (error) {
        if (error.code === "ERR_CANCELED" || controller.signal.aborted) return;
        showToast(error?.response?.data?.message ?? error.message, true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadAdmins();
    return () => controller.abort();
  }, [page, reloadKey, searchQuery, showToast]);

  const refresh = useCallback(() => setReloadKey((value) => value + 1), []);

  const changeStatus = async (admin) => {
    const response = await toggleAdminStatus(admin._id);
    setAdmins((items) => items.map((item) => item._id === admin._id ? { ...item, isActive: response.data.isActive } : item));
    return response;
  };

  const removeAdmin = async (admin) => {
    const response = await deleteAdmin(admin._id);
    setAdmins((items) => items.filter((item) => item._id !== admin._id));
    return response;
  };

  return { admins, loading, totalPages, refresh, changeStatus, removeAdmin };
}
