import { useCallback, useEffect, useState } from "react";
import {
  getCategoryNamesSnapshot,
  getCategories,
} from "../services/categoryService";
import {
  getDepartmentNamesSnapshot,
  getDepartments,
} from "../services/departmentService";

function useCatalogNames(getNamesSnapshot, getItems) {
  const [names, setNames] = useState(getNamesSnapshot);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    const response = await getItems();
    if (response.ok) {
      const activeNames = response.data
        .filter((item) => item.active !== false)
        .map((item) => item.name);
      setNames(activeNames);
    } else {
      setError(
        response.message ||
          "No se pudieron cargar las opciones.",
      );
    }

    setLoading(false);
    return response;
  }, [getItems]);

  useEffect(() => {
    let mounted = true;
    const cachedNames = getNamesSnapshot();

    if (cachedNames.length) {
      return () => {
        mounted = false;
      };
    }

    setLoading(true);
    setError("");

    getItems().then((response) => {
      if (mounted) {
        if (response.ok) {
          setNames(
            response.data
              .filter((item) => item.active !== false)
              .map((item) => item.name),
          );
        } else {
          setError(
            response.message ||
              "No se pudieron cargar las opciones.",
          );
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [getItems]);

  return { error, loading, names, refresh };
}

export function useDepartmentOptions() {
  return useCatalogNames(
    getDepartmentNamesSnapshot,
    getDepartments,
  );
}

export function useCategoryOptions() {
  return useCatalogNames(
    getCategoryNamesSnapshot,
    getCategories,
  );
}
