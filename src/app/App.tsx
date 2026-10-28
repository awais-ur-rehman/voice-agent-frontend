import { useState } from "react";
import { RouterProvider } from "react-router";
import { AuthProvider } from "./auth";
import { createAppRouter } from "./router";
export function App() {
  const [router] = useState(createAppRouter);
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
