import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Camera, Loader2, RefreshCw, Sparkles, Upload, AlertCircle } from 'lucide-react';

export function CameraSimulator({ onComplete }: { onComplete: (before: string, after: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hasRequestedCamera, setHasRequestedCamera] = useState(false);

  const startCamera = useCallback(async () => {
    setHasRequestedCamera(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("API de câmera não suportada");
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err: any) {
      console.error("Erro ao acessar câmera:", err);
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
        setError("Acesso à câmera negado. Permita o acesso no navegador ou envie uma foto.");
      } else {
        setError("Câmera indisponível. Por favor, envie uma foto da galeria.");
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]); // Clean up stream on unmount

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      let width = video.videoWidth;
      let height = video.videoHeight;
      const maxSize = 1024; // Max dimension for API
      
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Flip horizontally to match the mirrored video preview
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8); // Compress slightly
        setCapturedImage(dataUrl);
        
        // Stop camera to save resources
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxSize = 1024;
          
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            } else {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            setCapturedImage(canvas.toDataURL('image/jpeg', 0.8));
            setError(null);
            if (stream) {
              stream.getTracks().forEach(track => track.stop());
              setStream(null);
            }
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const generateSmile = async (retryCount = 0) => {
    if (!capturedImage) return;
    setIsGenerating(true);
    if (retryCount === 0) setError(null);
    
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Chave da API não configurada. Adicione VITE_GEMINI_API_KEY nas variáveis de ambiente.");
      }
      
      const ai = new GoogleGenAI({ apiKey });
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
        setIsGenerating(false);
      } else {
        setError('Falha ao gerar a imagem. Tente tirar uma foto mais clara do seu rosto.');
        setIsGenerating(false);
      }
    } catch (err: any) {
      console.error("API Error:", err);
      const errorString = typeof err === 'object' ? JSON.stringify(err) : String(err);
      
      const isUnavailable = err.status === 503 || errorString.includes('503') || errorString.includes('UNAVAILABLE');
      
      if (isUnavailable && retryCount < 2) {
        console.log(`Serviço indisponível. Tentando novamente... (${retryCount + 1}/2)`);
        setTimeout(() => generateSmile(retryCount + 1), 2000 * (retryCount + 1));
        return; // Exit early to prevent setting isGenerating to false
      }
      
      if (isUnavailable) {
        setError('O serviço de Inteligência Artificial está temporariamente indisponível devido a alta demanda. Por favor, tente novamente em alguns instantes.');
      } else if (err.status === 429 || errorString.includes('429') || errorString.includes('quota')) {
        setError('Limite de uso atingido. Por favor, tente novamente mais tarde.');
      } else {
        setError('Erro ao processar a imagem com a IA. Tente novamente.');
      }
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 flex flex-col font-body">
      {/* Camera / Preview Area */}
      <div className="relative aspect-[3/4] bg-gray-900 flex items-center justify-center overflow-hidden">
        {!capturedImage ? (
          <>
            {!hasRequestedCamera && !error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 p-8 text-center z-10 gap-6">
                <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-2">
                  <Camera size={40} className="text-gray-400" />
                </div>
                <div>
                  <h3 className="text-white text-lg font-bold mb-2">Pronto para a simulação?</h3>
                  <p className="text-gray-400 text-sm">
                    Para começarmos, precisamos acessar a sua câmera.
                  </p>
                </div>
                <button 
                  onClick={startCamera}
                  className="w-full bg-brand-primary text-white px-6 py-4 rounded-full text-base font-bold hover:bg-[#b32957] transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                  <Camera size={20} />
                  Ativar Câmera
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-gray-400 text-sm hover:text-white underline"
                >
                  Ou envie uma foto da galeria
                </button>
              </div>
            ) : (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
              />
            )}
            
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 p-8 text-center z-20 gap-4 overflow-y-auto">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-2 shrink-0">
                  <AlertCircle size={32} className="text-gray-400" />
                </div>
                <p className="text-white text-sm font-medium">{error}</p>
                
                <div className="bg-gray-800/50 p-4 rounded-xl text-left w-full mt-2">
                  <p className="text-xs text-gray-300 mb-2 font-semibold">Se você está vendo isso em um site (WordPress):</p>
                  <p className="text-xs text-gray-400">
                    O administrador do site precisa adicionar <code className="bg-black/30 px-1 rounded text-brand-primary">allow="camera"</code> no código do iframe.
                  </p>
                </div>

                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 w-full bg-brand-primary text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-[#b32957] transition-colors flex items-center justify-center gap-2 shrink-0"
                >
                  <Upload size={18} />
                  Escolher Foto da Galeria
                </button>
                <button 
                  onClick={startCamera}
                  className="text-gray-400 text-xs hover:text-white underline mt-2 shrink-0"
                >
                  Tentar acessar câmera novamente
                </button>
              </div>
            )}
            
            {/* Face Guide Overlay */}
            {hasRequestedCamera && !error && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center opacity-50 z-10">
                <div className="w-48 h-64 border-2 border-dashed border-white rounded-[100px] mb-8"></div>
                <p className="text-white text-sm font-medium bg-black/50 px-4 py-1 rounded-full">
                  Posicione seu rosto aqui e sorria
                </p>
              </div>
            )}
          </>
        ) : (
          <img 
            src={capturedImage} 
            alt="Captured" 
            className="absolute inset-0 w-full h-full object-cover" 
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*"
          onChange={handleFileUpload}
        />
      </div>

      {/* Controls Area */}
      <div className="p-6 bg-white flex-1 flex flex-col justify-center">
        {!capturedImage ? (
          <div className="flex flex-col gap-3">
            <button 
              onClick={takePhoto}
              disabled={!!error}
              className="w-full bg-brand-accent hover:bg-gray-900 text-brand-primary font-bold py-4 rounded-full flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md border border-transparent"
            >
              <Camera size={24} />
              Tirar Foto do Sorriso
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-transparent border border-brand-link hover:bg-gray-50 text-brand-link font-medium py-3 rounded-full flex items-center justify-center gap-2 transition-colors"
            >
              <Upload size={20} />
              Ou envie uma foto da galeria
            </button>
          </div>
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
