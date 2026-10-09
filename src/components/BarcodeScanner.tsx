"use client";

import { useEffect, useRef, useState } from "react";

/** Live camera barcode scanner (EAN/UPC/Code128…) using ZXing — works in Safari too,
 *  which has no native BarcodeDetector. Camera needs HTTPS (or localhost). */
export default function BarcodeScanner({ onDetect }: { onDetect: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const cb = useRef(onDetect);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    cb.current = onDetect;
  }, [onDetect]);

  useEffect(() => {
    let stopped = false;
    let controls: { stop: () => void } | undefined;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera access needs a secure (https) connection.");
        }
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 150 });
        const c = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } }, audio: false },
          video.current as HTMLVideoElement,
          (result) => {
            if (result && !stopped) {
              stopped = true;
              cb.current(result.getText());
            }
          },
        );
        if (stopped) c.stop();
        else controls = c;
        setStarting(false);
      } catch (e) {
        const name = e instanceof Error ? e.name : "";
        setError(
          name === "NotAllowedError"
            ? "Camera permission was denied. Allow it in your browser settings, or type the barcode below."
            : e instanceof Error
              ? e.message
              : "Couldn't start the camera.",
        );
        setStarting(false);
      }
    })();
    return () => {
      stopped = true;
      controls?.stop();
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        aspectRatio: "4 / 3",
        borderRadius: 24,
        overflow: "hidden",
        background: "#0c0c0d",
        color: "#fff",
      }}
    >
      <video ref={video} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      {!error && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "22% 12%",
            border: "2px solid rgba(255,255,255,0.85)",
            borderRadius: 16,
            boxShadow: "0 0 0 999px rgba(0,0,0,0.28)",
          }}
        />
      )}
      {(starting || error) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            padding: 24,
            textAlign: "center",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {error ?? "Starting camera…"}
        </div>
      )}
    </div>
  );
}
