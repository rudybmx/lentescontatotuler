import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Camera, Loader2, RefreshCw, Sparkles } from 'lucide-react';

export function CameraSimulator({ onComplete }: { onComplete: (before: string, after: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err) {
      console.error("Erro ao acessar câmera:", err);
      setError("Não foi possível acessar a câmera. Verifique as permissões do seu navegador.");
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas to match video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Flip horizontally to match the mirrored video preview
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);
        
        // Stop camera to save resources
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const generateSmile = async () => {
    if (!capturedImage) return;
    setIsGenerating(true);
    setError(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const mimeType = capturedImage.split(';')[0].split(':')[1];
      const base64Data = capturedImage.split(',')[1];

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: 'Enhance the photo quality. Analyze the image, find the person\'s face, and fix their teeth naturally, making them straight, white, and perfect like high-end dental veneers. Keep the rest of the image exactly the same.' }
          ]
        }
      });

      let afterImage = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          afterImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (afterImage) {
        onComplete(capturedImage, afterImage);
      } else {
        setError('Falha ao gerar a imagem. Tente tirar uma foto mais clara do seu rosto.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao processar a imagem com a IA. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 flex flex-col font-body">
      {/* Camera / Preview Area */}
      <div className="relative aspect-[3/4] bg-gray-900 flex items-center justify-center overflow-hidden">
        {!capturedImage ? (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
            />
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-center z-10">
                <p className="text-white text-sm">{error}</p>
              </div>
            )}
            
            {/* Face Guide Overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center opacity-50">
              <div className="w-48 h-64 border-2 border-dashed border-white rounded-[100px] mb-8"></div>
              <p className="text-white text-sm font-medium bg-black/50 px-4 py-1 rounded-full">
                Posicione seu rosto aqui e sorria
              </p>
            </div>
          </>
        ) : (
          <img 
            src={capturedImage} 
            alt="Captured" 
            className="absolute inset-0 w-full h-full object-cover" 
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls Area */}
      <div className="p-6 bg-white flex-1 flex flex-col justify-center">
        {!capturedImage ? (
          <button 
            onClick={takePhoto}
            disabled={!!error}
            className="w-full bg-brand-accent hover:bg-gray-900 text-brand-primary font-bold py-4 rounded-full flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md border border-transparent"
          >
            <Camera size={24} />
            Tirar Foto do Sorriso
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <button 
              onClick={generateSmile}
              disabled={isGenerating}
              className="w-full bg-brand-primary hover:bg-[#b32957] text-white font-bold py-4 rounded-full flex items-center justify-center gap-2 transition-colors disabled:opacity-70 shadow-md border border-transparent"
            >
              {isGenerating ? (
                <><Loader2 className="animate-spin" size={24} /> Criando Lentes...</>
              ) : (
                <><Sparkles size={24} /> Ver Meu Novo Sorriso</>
              )}
            </button>
            <button 
              onClick={retakePhoto}
              disabled={isGenerating}
              className="w-full bg-transparent border border-brand-link hover:bg-gray-50 text-brand-link font-medium py-3 rounded-full flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={20} />
              Tirar Outra Foto
            </button>
          </div>
        )}
        
        {error && capturedImage && (
          <p className="text-sm text-red-500 mt-3 text-center">{error}</p>
        )}
        
        <p className="text-xs text-brand-link mt-4 text-center">
          Sua foto será processada de forma segura por Inteligência Artificial para simular o resultado das lentes de porcelana.
        </p>
      </div>
    </div>
  );
}
