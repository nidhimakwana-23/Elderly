import { useQuery } from "@tanstack/react-query";
import { fetchMedicines } from "../../api/medicines";
import { medicineKeys } from "./keys";

export function useGetMedicines() {
  return useQuery({
    queryKey: medicineKeys.lists(),
    queryFn: fetchMedicines,
  });
}
