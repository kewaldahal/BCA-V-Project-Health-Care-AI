import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getChatResponse } from '../services/geminiService';
import { BotIcon } from './icons/BotIcon';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface DisplayMessage {
  text: string;
  sender: 'user' | 'ai';
}

const ChatAssistant: React.FC = () => {
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([
    { sender: 'ai', text: "Hello! I'm your AI health assistant. How can I help you today? Please remember, I'm not a doctor." }
  ]);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages]);

  const handleSend = useCallback(async () => {
    if (input.trim() === '' || isLoading) return;

    const userDisplayMessage: DisplayMessage = { text: input, sender: 'user' };
    setDisplayMessages(prev => [...prev, userDisplayMessage]);
    
    const userMessage: Message = { role: 'user', parts: [{ text: input }] };
    const currentHistory = [...chatHistory, userMessage];

    setInput('');
    setIsLoading(true);

    try {
      const aiResponse = await getChatResponse(input, currentHistory);
      const aiDisplayMessage: DisplayMessage = { text: aiResponse, sender: 'ai' };
      const aiMessage: Message = { role: 'model', parts: [{ text: aiResponse }] };
      setDisplayMessages(prev => [...prev, aiDisplayMessage]);
      setChatHistory([...currentHistory, aiMessage]);
    } catch (error) {
      const errorMessage: DisplayMessage = { text: 'Sorry, I encountered an error. Please try again.', sender: 'ai' };
      setDisplayMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, chatHistory]);

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-center text-gray-900 dark:text-white">AI Health Assistant</h2>
      </div>
      <div className="flex-grow p-4 overflow-y-auto">
        <div className="space-y-4">
          {displayMessages.map((msg, index) => (
            <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'ai' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white"><BotIcon className="w-5 h-5"/></div>}
              <div
                className={`max-w-md px-4 py-2 rounded-2xl ${
                  msg.sender === 'user'
                    ? 'bg-red-600 text-white rounded-br-none'
                    : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
             <div className="flex items-end gap-2 justify-start">
               <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white"><BotIcon className="w-5 h-5"/></div>
                <div className="px-4 py-3 bg-gray-200 dark:bg-gray-800 rounded-2xl rounded-bl-none">
                    <div className="flex items-center justify-center space-x-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    </div>
                </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            className="flex-grow p-3 bg-gray-100 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
            placeholder="Ask a health question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || input.trim() === ''}
            className="px-5 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;