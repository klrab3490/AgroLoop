"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";

export interface CameraQrScannerProps {
  onScan: (decodedText: string) => void;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  simulateSampleCode?: string;
  className?: string;
  autoCloseOnScan?: boolean;
}

export function CameraQrScanner({
  onScan,
  onClose,
  title = "Household QR Scanner",
  subtitle = "Align resident's QR pass inside the viewfinder frame",
  simulateSampleCode = "ECO-2126-PASS",
  className = "",
  autoCloseOnScan = true,
}: CameraQrScannerProps) {
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const hasScannedRef = useRef<boolean>(false);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore track stop errors
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsTorchOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setErrorMessage(null);

    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("Camera access is not supported by your browser environment.");
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback constraint if ideal facingMode is rejected
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setIsCameraActive(true);
      }

      // Check available devices
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setHasMultipleCameras(videoDevices.length > 1);
      } catch {
        // Ignore enumerate devices errors
      }

      // Check torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && typeof videoTrack.getCapabilities === "function") {
        const capabilities = videoTrack.getCapabilities() as { torch?: boolean };
        setHasTorch(Boolean(capabilities?.torch));
      }
    } catch (err: unknown) {
      console.warn("Camera start error:", err);
      if (
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")
      ) {
        setErrorMessage("Camera permission denied. Please allow camera access in browser settings.");
      } else if (
        err instanceof DOMException &&
        (err.name === "NotFoundError" || err.name === "DevicesNotFoundError")
      ) {
        setErrorMessage("No camera hardware found on this device. You can upload a QR image or enter code.");
      } else if (
        err instanceof DOMException &&
        (err.name === "NotReadableError" || err.name === "TrackStartError")
      ) {
        setErrorMessage("Camera is currently in use by another application. Please close other camera apps.");
      } else {
        setErrorMessage("Could not initialize camera stream. Please try file upload or manual input.");
      }
      setIsCameraActive(false);
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const handleSuccessfulScan = useCallback(
    (code: string) => {
      setScannedCode(code);

      // Play soft feedback audio if allowed
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
          osc.start();
          osc.stop(ctx.currentTime + 0.14);
        }
      } catch {
        // Audio playback error ignored
      }

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(100);
        } catch {
          // Vibration error ignored
        }
      }

      setTimeout(() => {
        onScan(code);
        if (autoCloseOnScan && onClose) {
          onClose();
        }
      }, 400);
    },
    [onScan, autoCloseOnScan, onClose]
  );

  // Video frame scanning loop
  useEffect(() => {
    if (!isCameraActive) return;

    let isMounted = true;
    hasScannedRef.current = false;

    const scanLoop = async () => {
      if (!isMounted || hasScannedRef.current) return;

      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        const now = performance.now();
        // Throttle decoding to ~120ms intervals
        if (now - lastScanTimeRef.current >= 120) {
          lastScanTimeRef.current = now;

          let resultText: string | null = null;

          // 1. Native BarcodeDetector API if supported
          if ("BarcodeDetector" in window) {
            try {
              const BarcodeDetectorCtor = (window as unknown as {
                BarcodeDetector: new (opts: { formats: string[] }) => {
                  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
                };
              }).BarcodeDetector;
              const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });
              const barcodes = await detector.detect(video);
              if (barcodes.length > 0 && barcodes[0].rawValue) {
                resultText = barcodes[0].rawValue;
              }
            } catch {
              // Fall through to jsQR
            }
          }

          // 2. jsQR fallback via canvas
          if (!resultText && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (ctx) {
              const maxDim = 800;
              let w = video.videoWidth;
              let h = video.videoHeight;
              if (w > maxDim || h > maxDim) {
                const ratio = Math.min(maxDim / w, maxDim / h);
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
              }
              canvas.width = w;
              canvas.height = h;
              ctx.drawImage(video, 0, 0, w, h);

              try {
                const imgData = ctx.getImageData(0, 0, w, h);
                const decoded = jsQR(imgData.data, imgData.width, imgData.height, {
                  inversionAttempts: "dontInvert",
                });
                if (decoded && decoded.data) {
                  resultText = decoded.data;
                }
              } catch {
                // Ignore canvas read error
              }
            }
          }

          if (resultText && !hasScannedRef.current) {
            hasScannedRef.current = true;
            handleSuccessfulScan(resultText);
            return;
          }
        }
      }

      if (isMounted && !hasScannedRef.current) {
        animFrameRef.current = requestAnimationFrame(scanLoop);
      }
    };

    animFrameRef.current = requestAnimationFrame(scanLoop);

    return () => {
      isMounted = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isCameraActive, handleSuccessfulScan]);

  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextTorch = !isTorchOn;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setIsTorchOn(nextTorch);
    } catch (err) {
      console.warn("Torch toggle failed:", err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        let decodedText: string | null = null;

        // Try BarcodeDetector first
        if ("BarcodeDetector" in window) {
          try {
            const BarcodeDetectorCtor = (window as unknown as {
              BarcodeDetector: new (opts: { formats: string[] }) => {
                detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
              };
            }).BarcodeDetector;
            const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });
            const barcodes = await detector.detect(img);
            if (barcodes.length > 0 && barcodes[0].rawValue) {
              decodedText = barcodes[0].rawValue;
            }
          } catch {
            // Fall through
          }
        }

        // Try jsQR fallback
        if (!decodedText && canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            try {
              const imgData = ctx.getImageData(0, 0, img.width, img.height);
              const decoded = jsQR(imgData.data, imgData.width, imgData.height, {
                inversionAttempts: "attemptBoth",
              });
              if (decoded && decoded.data) {
                decodedText = decoded.data;
              }
            } catch {
              // Ignore
            }
          }
        }

        setIsProcessingFile(false);
        if (decodedText) {
          handleSuccessfulScan(decodedText);
        } else {
          setErrorMessage("No QR code detected in the uploaded image. Please try a clearer picture.");
        }
      };
      img.onerror = () => {
        setIsProcessingFile(false);
        setErrorMessage("Could not parse the selected image file.");
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
    // Reset file input so user can choose same file again if desired
    e.target.value = "";
  };

  const handleSimulateScan = () => {
    handleSuccessfulScan(simulateSampleCode);
  };

  return (
    <div
      className={`relative bg-slate-950 text-white rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col ${className}`}
    >
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800 backdrop-blur-xs z-20">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                isCameraActive ? "bg-emerald-400 opacity-75" : "bg-amber-400 opacity-50"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isCameraActive ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
          </span>
          <div>
            <h4 className="text-xs font-black tracking-wide text-white">{title}</h4>
            <p className="text-3xs text-slate-400">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {hasMultipleCameras && (
            <button
              type="button"
              onClick={handleFlipCamera}
              title="Switch camera"
              aria-label="Switch camera"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition"
            >
              🔄
            </button>
          )}
          {hasTorch && (
            <button
              type="button"
              onClick={handleToggleTorch}
              title={isTorchOn ? "Turn flashlight off" : "Turn flashlight on"}
              aria-label="Toggle flashlight"
              className={`p-1.5 rounded-lg text-xs transition ${
                isTorchOn
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
              }`}
            >
              🔦
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              aria-label="Close scanner"
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold transition ml-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Viewfinder Section */}
      <div className="relative min-h-[260px] sm:min-h-[290px] w-full flex items-center justify-center bg-black overflow-hidden">
        {/* Real video feed */}
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isCameraActive && !errorMessage ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        />

        {/* Viewfinder Overlay Targeting Reticle */}
        {isCameraActive && !errorMessage && !scannedCode && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 pointer-events-none">
            {/* Viewfinder Box */}
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-2xl border border-emerald-400/30 overflow-hidden shadow-[0_0_0_9999px_rgba(15,23,42,0.65)]">
              {/* Corner markers */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

              {/* Animated Laser Scanning Beam */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-[scanLaser_2.2s_ease-in-out_infinite]" />
            </div>

            <p className="mt-4 text-3xs font-semibold text-emerald-300/90 tracking-wide bg-slate-900/80 px-3 py-1 rounded-full border border-emerald-500/20 backdrop-blur-xs">
              ⚡ Point camera directly at resident QR pass
            </p>
          </div>
        )}

        {/* Scan Success Overlay */}
        {scannedCode && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-emerald-950/85 backdrop-blur-xs p-6 text-center animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mb-3 animate-bounce">
              <span className="text-2xl text-emerald-300">✓</span>
            </div>
            <h5 className="text-sm font-black text-white">QR Code Captured!</h5>
            <p className="text-3xs text-emerald-200/90 font-mono mt-1 max-w-xs truncate px-2 py-1 bg-emerald-900/60 rounded-md border border-emerald-700/50">
              {scannedCode}
            </p>
            <p className="text-3xs text-emerald-300 mt-2">Authenticating handshake credentials...</p>
          </div>
        )}

        {/* Error / Fallback State View */}
        {errorMessage && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-slate-950/95 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xl">
              ⚠️
            </div>
            <div className="max-w-xs space-y-1">
              <p className="text-xs font-bold text-slate-200">Camera Notice</p>
              <p className="text-2xs text-slate-400">{errorMessage}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={startCamera}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-2xs font-bold rounded-lg transition border border-slate-700"
              >
                🔄 Retry Camera
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-2xs font-bold rounded-lg transition shadow-xs"
              >
                📁 Upload Photo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Toolset Bar */}
      <div className="p-3 bg-slate-900/95 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 z-20">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingFile}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 hover:text-white text-2xs font-bold rounded-lg border border-slate-700/80 transition flex items-center gap-1.5"
          >
            <span>📷</span>
            <span>{isProcessingFile ? "Scanning Image..." : "Upload / Snap Photo"}</span>
          </button>

          {simulateSampleCode && (
            <button
              type="button"
              onClick={handleSimulateScan}
              className="px-2.5 py-1.5 bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-700/40 text-emerald-300 hover:text-white text-2xs font-bold rounded-lg transition flex items-center gap-1"
              title="Simulate scanning a valid test pass"
            >
              <span>⚡</span>
              <span>Test Sample</span>
            </button>
          )}
        </div>

        {onClose && (
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-2xs font-semibold rounded-lg transition"
          >
            Close Scanner
          </button>
        )}
      </div>
    </div>
  );
}
