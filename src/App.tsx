import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { BookingProvider } from "./contexts/BookingContext";
import { NavigationProvider } from "./contexts/NavigationContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Obrigado from "./pages/Obrigado";
import AuthCallback from "./pages/AuthCallback";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const navigate = useNavigate();

  return (
    <NavigationProvider navigate={navigate}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/obrigado" element={<Obrigado />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </NavigationProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BookingProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </BookingProvider>
  </QueryClientProvider>
);

export default App;
