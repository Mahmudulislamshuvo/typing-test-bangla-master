"use client";

import { useEffect } from "react";
import { getAnalytics, isSupported } from "firebase/analytics";
import app from "../lib/firebase";

export default function FirebaseAnalytics() {
  useEffect(() => {
    let isActive = true;

    isSupported()
      .then((supported) => {
        if (supported && isActive) {
          getAnalytics(app);
        }
      })
      .catch(() => {});

    return () => {
      isActive = false;
    };
  }, []);

  return null;
}
