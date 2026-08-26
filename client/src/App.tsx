import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ArcaneFrontier from "./pages/ArcaneFrontier";
import CreatorStudio from "./pages/CreatorStudio";

function isCreatorStudioRoute() {
  if (typeof window === "undefined") return false;
  const isRequested = window.location.pathname === "/creator-studio";
  const enabled = import.meta.env.DEV || import.meta.env.VITE_CREATOR_STUDIO_ENABLED === "true";
  return isRequested && enabled;
}

function App() {
  const page = isCreatorStudioRoute() ? <CreatorStudio /> : <ArcaneFrontier />;

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          {page}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
