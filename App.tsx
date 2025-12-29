
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message, GroundingSource } from './types';
import { gemini } from './services/geminiService';
import ChatMessage from './components/ChatMessage';
import { SUGGESTIONS } from './constants';

const App: React.FC = () => {
  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string, data: string, mimeType: string } | null>(null);
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setSelectedImage({
          url: URL.createObjectURL(file),
          data: base64,
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSelectedImage(null);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowCopyFeedback(true);
    setTimeout(() => setShowCopyFeedback(false), 2000);
  };

  const handleSend = useCallback(async (text: string) => {
    if ((!text.trim() && !selectedImage) || isLoading) return;

    const currentImage = selectedImage;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      imageUrl: currentImage?.url
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    const assistantId = (Date.now() + 1).toString();
    const initialAssistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, initialAssistantMessage]);

    try {
      const history = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user' as 'model' | 'user',
        parts: [{ text: m.content }]
      }));

      let fullContent = '';
      let detectedSources: GroundingSource[] = [];
      const imagePart = currentImage ? { mimeType: currentImage.mimeType, data: currentImage.data } : undefined;
      
      const stream = gemini.streamChat(text || "Help me understand this image.", history, imagePart);

      for await (const chunk of stream) {
        if (chunk) {
          fullContent += chunk.text || '';
          if (chunk.groundingMetadata?.groundingChunks) {
            const chunks = chunk.groundingMetadata.groundingChunks;
            const sources: GroundingSource[] = chunks
              .filter((c: any) => c.web)
              .map((c: any) => ({ title: c.web.title, uri: c.web.uri }));
            if (sources.length > 0) detectedSources = sources;
          }

          setMessages(prev => 
            prev.map(m => m.id === assistantId ? { 
              ...m, 
              content: fullContent,
              sources: detectedSources.length > 0 ? detectedSources : m.sources
            } : m)
          );
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => 
        prev.map(m => m.id === assistantId ? { ...m, content: "I encountered an error. Please direct account actions to support." } : m)
      );
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, selectedImage]);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gradient-to-br from-[#f0fdf4] to-[#dcfce7] overflow-hidden">
      {/* Sidebar - About & Sharing */}
      <aside className="hidden md:flex flex-col w-72 bg-white/60 backdrop-blur-md border-r border-gray-200/50 p-6 overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
          <span className="mr-2">📊</span> Bot Dashboard
        </h2>
        
        <div className="space-y-6">
          <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20">
            <h3 className="text-sm font-bold text-emerald-800 mb-2 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              Share Access
            </h3>
            <p className="text-[11px] text-emerald-700/70 mb-3">Copy the link below to share this AI assistant with your team or users.</p>
            <button 
              onClick={copyLink}
              className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${showCopyFeedback ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 shadow-sm'}`}
            >
              {showCopyFeedback ? '✅ Copied to Clipboard' : '🔗 Copy Project Link'}
            </button>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Capabilities</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              • 📦 Order workflows
              <br />• 🔄 Substitution policies  
              <br />• 📋 Packing procedures
              <br />• 📍 Delivery stages
            </p>
          </div>
          
          <hr className="border-gray-200" />
          
          <button 
            onClick={clearChat}
            className="w-full py-2.5 px-4 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            🗑️ Clear History
          </button>
          
          <div className="mt-auto pt-10 text-center">
             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-2">Deployed on Static Web</p>
             <div className="flex justify-center space-x-2 grayscale opacity-50">
               <img src="https://img.icons8.com/color/48/000000/google-logo.png" className="w-4 h-4" />
               <img src="https://img.icons8.com/color/48/000000/react-native.png" className="w-4 h-4" />
             </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="px-6 py-4 flex items-center justify-between bg-white/30 backdrop-blur-md border-b border-gray-200/30">
          <div className="flex items-center space-x-4">
            <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-200">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 leading-tight">QuickGrocery Support</h1>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Process Bot • AI Assistant</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 md:hidden">
            <button 
              onClick={copyLink}
              className="p-2 bg-white rounded-full border border-gray-200 text-gray-600 shadow-sm active:scale-90 transition-transform"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            </button>
          </div>
        </header>

        {/* Info Banner */}
        <div className="mx-6 mt-4">
          <div className="bg-blue-50/90 border border-blue-200 rounded-2xl px-5 py-3 flex items-start space-x-3 shadow-sm backdrop-blur-sm">
            <div className="bg-blue-500 text-white rounded-full p-1 mt-0.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-xs text-blue-900 leading-relaxed font-medium">
              I explain platform processes. I cannot modify orders or process payments. For live order issues, please contact Platform Support.
            </p>
          </div>
        </div>

        {/* Scrollable Chat Feed */}
        <main className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
          <div className="max-w-4xl mx-auto w-full">
            {messages.length === 0 && (
              <div className="animate-fade-in py-6">
                <div className="flex items-start space-x-3 mb-10">
                   <div className="h-10 w-10 rounded-full flex items-center justify-center bg-white border border-gray-200 shadow-sm text-xl">🤖</div>
                   <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 text-sm text-gray-800 shadow-sm leading-relaxed max-w-[80%]">
                     👋 Welcome to <strong>QuickGrocery Support</strong>! I'm your AI guide for understanding how we handle your orders, from picking the freshest produce to final delivery.
                     <br/><br/>
                     What would you like to know about our process?
                   </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 ml-1">Suggested Inquiries</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {SUGGESTIONS.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(s.prompt)}
                        className="p-5 bg-white/70 border border-gray-100 rounded-[2rem] hover:border-emerald-500 hover:bg-white hover:shadow-xl hover:shadow-emerald-500/5 transition-all text-left group active:scale-95"
                      >
                        <div className="text-3xl mb-3 bg-white w-12 h-12 flex items-center justify-center rounded-2xl shadow-sm group-hover:scale-110 transition-transform">{s.icon}</div>
                        <h4 className="font-bold text-gray-800 text-sm mb-1 group-hover:text-emerald-600 transition-colors">{s.title}</h4>
                        <p className="text-[10px] text-gray-400 leading-tight line-clamp-2">{s.prompt}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Sticky Input Bar */}
        <footer className="p-4 md:p-8 bg-transparent">
          <div className="max-w-4xl mx-auto">
            {selectedImage && (
              <div className="mb-4 relative inline-block animate-in slide-in-from-bottom-4">
                <img src={selectedImage.url} alt="Selected" className="h-24 w-24 object-cover rounded-2xl border-4 border-white shadow-2xl" />
                <button onClick={() => setSelectedImage(null)} className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-colors border-2 border-white">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l18 18" /></svg>
                </button>
              </div>
            )}
            
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(input); }} 
              className="relative flex items-center bg-white/90 backdrop-blur-md border border-gray-200/50 rounded-[2.5rem] shadow-2xl shadow-emerald-900/5 overflow-hidden focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all p-2.5"
            >
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all"
                title="Attach item for explanation"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
              
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me how delivery works..."
                className="flex-1 bg-transparent py-4 px-3 text-base text-gray-800 outline-none placeholder-gray-400 font-medium"
                disabled={isLoading}
              />

              <button
                type="submit"
                disabled={isLoading || (!input.trim() && !selectedImage)}
                className={`flex items-center space-x-2 px-8 py-4 rounded-[2rem] transition-all font-bold text-sm ${isLoading || (!input.trim() && !selectedImage) ? 'bg-gray-100 text-gray-300' : 'bg-[#10b981] text-white hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 active:scale-95'}`}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Send</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </>
                )}
              </button>
            </form>
            
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            
            <p className="text-[10px] text-gray-400 text-center mt-6 font-bold uppercase tracking-[0.3em]">
              Powered by Gemini AI • 2025 Process Logic
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
