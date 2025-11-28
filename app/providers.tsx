"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BookingProvider } from "@/contexts/BookingContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { useRouter } from "next/navigation";

// Single query client instance for Next.js client tree
const queryClient = new QueryClient();

export function AppProviders({ children }: { children: ReactNode }) {
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const navigate = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router],
  );

  const replace = useCallback(
    (path: string) => {
      router.replace(path);
    },
    [router],
  );

  if (!isClient) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BookingProvider>
        <TooltipProvider>
          <NavigationProvider navigate={navigate} replace={replace}>
            <Toaster />
            <Sonner />
            {children}
          </NavigationProvider>
        </TooltipProvider>
      </BookingProvider>
    </QueryClientProvider>
  );
}
