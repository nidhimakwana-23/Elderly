import { useQuery } from "@tanstack/react-query";
import { fetchHealthChecks } from "../../api/health-checks";
import { healthCheckKeys } from "./keys";

export function useGetHealthChecks(patientId: string | undefined) {
  return useQuery({
    queryKey: healthCheckKeys.list(patientId ?? ''),
    queryFn: () => fetchHealthChecks(patientId!),
    enabled: !!patientId,
  });
}
