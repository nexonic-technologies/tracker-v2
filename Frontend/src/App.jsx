import { useState, useCallback } from "react";
import BaseLayout from "./layouts/baseLayouts";
import { Toaster } from "react-hot-toast";
import SplashScreen from "./components/SplashScreen";
import { useAuth } from "./context/authProvider";

function App() {
  // App lives *inside* the provider tree (see main.jsx), so useAuth() works here.
  const { setUser, setSeededContext } = useAuth();

  const [splashDone, setSplashDone] = useState(() => {
    return sessionStorage.getItem("splashShown") === "true";
  });

  const handleSplashFinish = useCallback((ctx) => {
    if (ctx) {
      // Valid token — seed PermissionProvider directly, skip its API call
      setSeededContext(ctx);
    } else {
      // Invalid / expired token — validateToken() already cleared cookies+localStorage.
      // Force React auth state to null so the app redirects to /login immediately
      // instead of waiting for the first 403 to trigger forceLogout.
      setUser(null);
    }
    sessionStorage.setItem("splashShown", "true");
    setSplashDone(true);
  }, [setSeededContext, setUser]);

  return (
    <>
      <Toaster position="top-right" />
      {!splashDone && <SplashScreen onFinish={handleSplashFinish} />}
      <BaseLayout />
    </>
  );
}

export default App;
