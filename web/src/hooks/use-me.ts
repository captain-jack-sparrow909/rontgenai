"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { fetchMe, type MeResponse } from "@/lib/api";

export function useMe() {
  const { getToken, isSignedIn, isLoaded } = useAuth();

  return useQuery<MeResponse>({
    queryKey: ["me"],
    enabled: Boolean(isLoaded && isSignedIn),
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      return fetchMe(token);
    },
    staleTime: 30_000,
    retry: 1,
  });
}
