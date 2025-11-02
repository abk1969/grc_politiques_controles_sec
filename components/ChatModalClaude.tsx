import React, { useState, useEffect, useRef } from 'react';
import { createRequirementChat, sendChatMessageStream } from '../services/claudeServiceSecure';
import { IconSend } from './icons';
import type { AnalysisResult, ChatMessage, ClaudeConversation } from '../types';

interface ChatModalProps {
  requirement: AnalysisResult;
  onClose: () => void;
}

export const ChatModalClaude: React.FC<ChatModalProps> = ({ requirement, onClose }) => {
  const [conversation, setConversation] = useState<ClaudeConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const chat = createRequirementChat(requirement);
    setConversation(chat);
    setMessages([{ role: 'model', text: `Bonjour ! Comment puis-je vous aider avec l'exigence N°${requirement.id} ?` }]);
    setIsLoading(false);

    // Handle Escape key to close modal
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      window.removeEventListener('keydown', handleEscape);
    };
  }, [requirement, onClose]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || !conversation || isLoading) return;

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const textToSend = userInput;
    setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    setUserInput('');
    setIsLoading(true);

    try {
      let modelResponse = '';
      setMessages(prev => [...prev, { role: 'model', text: '' }]);

      try {
        const stream = sendChatMessageStream(conversation, textToSend);

        for await (const chunk of stream) {
          // Check if aborted
          if (abortControllerRef.current?.signal.aborted) {
            throw new Error('Request aborted');
          }

          modelResponse += chunk;
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].text = modelResponse;
            return newMessages;
          });
        }
      } catch (streamError) {
        // Handle streaming-specific errors
        if (streamError instanceof Error && streamError.message === 'Request aborted') {
          return; // Silently ignore aborted requests
        }
        throw streamError; // Re-throw other errors
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage = error instanceof Error && error.message === 'Request aborted'
        ? "Requête annulée."
        : "Désolé, une erreur est survenue. Veuillez vérifier votre connexion et réessayer.";

      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        // If last message is empty model message, replace it. Otherwise, add new error message
        if (lastMessage?.role === 'model' && !lastMessage.text) {
          return [...prev.slice(0, -1), { role: 'model', text: errorMessage }];
        }
        return [...prev, { role: 'model', text: errorMessage }];
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-modal-title"
    >
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b flex justify-between items-center">
          <h2 id="chat-modal-title" className="text-lg font-bold text-gray-800">
            Discussion sur l'exigence N°{requirement.id}
            <span className="ml-2 text-sm font-normal text-purple-600">powered by Claude Sonnet 4.5</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-2xl leading-none p-1"
            aria-label="Fermer le dialogue"
          >
            &times;
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-prose p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-purple-50 text-gray-800 border border-purple-200'}`}>
                {msg.text || <span className="animate-pulse">...</span>}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <footer className="p-4 border-t">
          <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
            <input
              type="text"
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              placeholder="Posez votre question à Claude..."
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-300"
              disabled={isLoading || !userInput.trim()}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <IconSend className="w-5 h-5" />
              )}
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
};
