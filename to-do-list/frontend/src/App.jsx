import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "./routes";
import { Toaster } from "sonner";

// Create a client for TanStack Query
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        position="top-center"
        closeButton
        toastOptions={{
          classNames: {
            toast: "comic-toast",
            title: "comic-toast-title",
            description: "comic-toast-description",
            closeButton: "comic-toast-close",
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
