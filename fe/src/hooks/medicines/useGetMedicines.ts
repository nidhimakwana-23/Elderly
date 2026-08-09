import { useQuery } from "@tanstack/react-query";
import { fetchMedicines } from "../../api/medicines";
import { medicineKeys } from "./keys";

export function useGetMedicines(patientId?: string) {
  return useQuery({
    queryKey: medicineKeys.lists(patientId),
    queryFn: () => fetchMedicines(patientId),
  });
}
