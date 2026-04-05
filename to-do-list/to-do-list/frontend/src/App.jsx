import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { Toaster } from "sonner";

function App() {
  return (
    <>
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
    </>
  );
}

export default App;
