import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Zap, ZapOff, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import jsQR from 'jsqr';

interface QRScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [scanning, setScanning] = useState(true);

  // Initialize camera
  useEffect(() => {
    let animationFrameId: number;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Required for iOS
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play();
        }

        setHasCamera(true);

        // Check if torch is supported
        const track = stream.getVideoTracks()[0];
        const capabilities = (track.getCapabilities?.() || {}) as any;
        if (capabilities.torch) {
          setTorchSupported(true);
        }

        requestAnimationFrame(tick);
      } catch (err) {
        console.error("Camera error:", err);
        setHasCamera(false);
      }
    };

    const tick = () => {
      if (!scanning) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (context) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code) {
            setScanning(false);
            stopCamera();
            onScan(code.data);
            return;
          }
        }
      }
      
      animationFrameId = requestAnimationFrame(tick);
    };

    startCamera();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      stopCamera();
    };
  }, [onScan, scanning]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      await track.applyConstraints({
        advanced: [{ torch: !torchEnabled }]
      } as any);
      setTorchEnabled(!torchEnabled);
    } catch (err) {
      console.error("Torch error:", err);
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  if (hasCamera === false) {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-6 rounded-3xl max-w-sm w-full space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Câmera não disponível</h2>
          <p className="text-gray-500 text-sm">
            Precisamos de acesso à sua câmera para escanear a tag. Por favor, verifique as permissões do seu dispositivo e navegador.
          </p>
          <button 
            onClick={onClose}
            className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold active:scale-95 transition-all mt-4"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-50 overflow-hidden"
    >
      {/* Video Feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        muted
        playsInline
      />
      
      {/* Hidden Canvas for QR processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Transparent Overlay UI */}
      <div className="absolute inset-0 pointer-events-none flex flex-col">
        
        {/* Top Header */}
        <div className="p-6 flex justify-between items-start pointer-events-auto relative z-10 pt-safe-top">
          <button 
            onClick={handleClose}
            className="w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center active:scale-95 transition-all"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          
          <div className="flex-1" />
        </div>

        {/* Center Scanner Area */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 relative">
          
          {/* Darken surroundings (Optional but good for UX) - We achieve this by adding a box shadow to the cutout */}
          <div className="relative w-full aspect-square max-w-[300px] mb-8">
            <div className="absolute inset-0 border-2 border-white/20 rounded-3xl" style={{ boxShadow: '0 0 0 4000px rgba(0,0,0,0.5)' }} />
            
            {/* 4 Corners */}
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-white rounded-tl-3xl z-10" />
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-white rounded-tr-3xl z-10" />
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-white rounded-bl-3xl z-10" />
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-white rounded-br-3xl z-10" />
            
            {/* Scanning Line Animation */}
            <motion.div 
              animate={{ top: ['5%', '95%', '5%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="absolute left-4 right-4 h-0.5 bg-orange-500 shadow-[0_0_8px_2px_rgba(249,115,22,0.8)] z-20"
            />
          </div>

          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white font-medium text-center bg-black/50 backdrop-blur-md px-6 py-3 rounded-2xl z-10"
          >
            Alinhe o código QR para escanear
          </motion.p>
        </div>

        {/* Bottom Bar */}
        <div className="p-8 pb-safe-bottom flex justify-center items-end pointer-events-auto relative z-10">
          {hasCamera === null && (
            <div className="bg-black/60 backdrop-blur-md rounded-full px-6 py-3 flex items-center gap-2">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
              <span className="text-white text-sm font-medium">Iniciando câmera...</span>
            </div>
          )}

          {torchSupported && (
            <button
              onClick={toggleTorch}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                torchEnabled ? 'bg-orange-500 shadow-lg shadow-orange-500/40 text-white' : 'bg-black/40 backdrop-blur-md text-white border border-white/20'
              }`}
            >
              {torchEnabled ? <Zap className="w-6 h-6" /> : <ZapOff className="w-6 h-6" />}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
