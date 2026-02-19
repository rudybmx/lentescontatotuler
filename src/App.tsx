import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { ImageSlider } from './components/ImageSlider';
import { CameraSimulator } from './components/CameraSimulator';

export default function App() {
  const [result, setResult] = useState<{before: string, after: string} | null>(null);

  const handleDownload = () => {
    if (!result?.after) return;
    const link = document.createElement('a');
    link.href = result.after;
    link.download = 'meu-novo-sorriso-lentes.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-body py-12 px-4 flex items-center justify-center">
      
      {/* The actual Before & After Section for WordPress */}
      <section className="w-full max-w-[1200px] mx-auto bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-gray-100">
        
        <div className="grid grid-cols-1 lg:grid-cols-2">
          
          {/* Left Column: Text & CTA */}
          <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center">
            <div className="inline-block px-4 py-1.5 bg-gray-100 text-brand-primary font-semibold text-sm rounded-full mb-6 w-fit">
              Simulador de Lentes de Porcelana
            </div>
            
            <h2 className="text-4xl md:text-[56px] font-heading font-bold text-brand-accent mb-6 tracking-tight leading-tight">
              Descubra o seu <br/><span className="text-brand-primary">Novo Sorriso</span>
            </h2>
            
            <p className="text-lg text-brand-link mb-8 leading-relaxed font-body">
              Tire uma foto agora mesmo e veja como seu sorriso pode ficar com nossas Lentes de Porcelana, usando inteligência artificial de última geração.
            </p>
            
            {result && (
              <div className="mt-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <button 
                  onClick={() => setResult(null)}
                  className="mb-6 text-brand-link font-medium hover:text-brand-primary transition-colors flex items-center gap-2"
                >
                  ← Fazer nova simulação
                </button>
                <button className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-brand-primary bg-brand-accent rounded-full shadow-lg hover:bg-gray-900 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-transparent">
                  Quero Agendar Minha Avaliação
                </button>
              </div>
            )}
            
            {!result && (
              <div className="mt-auto">
                <div className="flex items-center gap-4 text-sm text-brand-link">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs text-brand-accent">1</div>
                    <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs text-brand-accent">2</div>
                    <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs text-brand-accent">3</div>
                  </div>
                  <p>Mais de <strong className="text-brand-accent">5.000</strong> sorrisos transformados</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Interactive Area */}
          <div className="bg-gray-50 p-6 md:p-12 flex items-center justify-center border-t lg:border-t-0 lg:border-l border-gray-100 min-h-[600px]">
            {!result ? (
              <CameraSimulator onComplete={(before, after) => setResult({ before, after })} />
            ) : (
              <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-500">
                <div className="relative w-full aspect-[3/4] overflow-hidden bg-gray-100">
                  <ImageSlider beforeSrc={result.before} afterSrc={result.after} />
                </div>
                <div className="p-6 text-center border-t border-gray-100">
                  <h3 className="text-xl font-heading font-bold text-brand-accent">
                    Resultado da Simulação
                  </h3>
                  <p className="text-sm text-brand-link mt-2 mb-4 font-body">
                    Arraste para os lados para comparar o seu antes e depois.
                  </p>
                  <button 
                    onClick={handleDownload}
                    className="inline-flex items-center justify-center gap-2 text-sm font-medium text-brand-link hover:text-brand-primary transition-colors py-2 px-4 rounded-full hover:bg-gray-50"
                  >
                    <Download size={16} />
                    Baixar imagem do resultado
                  </button>
                </div>
              </div>
            )}
          </div>
          
        </div>

      </section>
    </div>
  );
}
