"use client";

import { useEffect, useState } from "react";
import { SplashScreen } from "@/components/branding/SplashScreen";

export function LandingSplash() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem("sas-splash-seen")) {
      setShow(true);
      sessionStorage.setItem("sas-splash-seen", "1");
    }
  }, []);

  if (!show) return null;
  return <SplashScreen onDone={() => setShow(false)} />;
}