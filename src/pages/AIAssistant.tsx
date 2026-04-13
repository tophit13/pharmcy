import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Bot, Send, Loader2 } from 'lucide-react';

export default function AIAssistant() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setResponse('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const systemInstruction = `أنت مساعد ذكي لصيدلي في مصر. مهمتك هي المساعدة في:
1. التحقق من التفاعلات الدوائية (Drug Interactions).
2. اقتراح بدائل للأدوية (Alternatives).
3. تقديم معلومات عن الجرعات والآثار الجانبية.
يجب أن تكون إجاباتك دقيقة، علمية، وباللغة العربية. حذر دائماً من أن هذه المعلومات استرشادية ويجب استشارة الطبيب.`;

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.2,
        }
      });

      setResponse(result.text || 'لم أتمكن من توليد إجابة.');
    } catch (error) {
      console.error(error);
      setResponse('حدث خطأ أثناء الاتصال بالمساعد الذكي. تأكد من إعداد مفتاح API الخاص بـ Gemini.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
          <Bot className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">المساعد الذكي (Gemini)</h1>
          <p className="text-gray-500 mt-1">اسأل عن التفاعلات الدوائية، البدائل، أو معلومات الأدوية</p>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
          {response ? (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 prose prose-blue max-w-none rtl">
              <div dangerouslySetInnerHTML={{ __html: response.replace(/\n/g, '<br/>') }} />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
              <Bot className="w-16 h-16 opacity-20" />
              <p className="text-lg">كيف يمكنني مساعدتك اليوم؟</p>
              <div className="flex gap-2 text-sm">
                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full">تفاعلات دوائية</span>
                <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full">بدائل الأدوية</span>
                <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full">الجرعات</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-gray-200">
          <form onSubmit={handleAskAI} className="flex gap-3">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="مثال: هل يوجد تفاعل بين كونكور وأسبرين؟"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 font-bold"
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
              إرسال
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
