import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

export function ChatInterface() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "1", role: "assistant", text: "Hello! I'm your Anuvaad Copilot. How can I help you understand this code today?" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMsg: ChatMessage = { id: Date.now().toString(), role: "user", text: input };
    setMessages(prev => [...prev, newMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate API delay for prototype
    setTimeout(() => {
      const botResponse: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: "assistant", 
        text: "That's a great question! Based on the current code context, this function is designed to handle asynchronous event processing." 
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <Button
          size="icon"
          className={cn(
            "h-12 w-12 rounded-full shadow-2xl transition-colors duration-300",
            isOpen ? "bg-amber-600 hover:bg-amber-700" : "bg-amber-500 hover:bg-amber-600"
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isOpen ? (
              <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <X className="h-5 w-5 text-white" />
              </motion.span>
            ) : (
              <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <MessageSquare className="h-5 w-5 text-white" />
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-24 right-6 w-80 md:w-96 h-[500px] z-50 flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 glass-apple"
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-black/40 backdrop-blur-md">
              <div className="bg-amber-500/20 p-1.5 rounded-md">
                <Sparkles className="h-4 w-4 text-amber-500" />
              </div>
              <h3 className="font-semibold text-sm">Anuvaad Copilot</h3>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/50 dark:bg-surface-charcoal/50">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-3 max-w-[85%]",
                    msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                    msg.role === "user" ? "bg-slate-200 dark:bg-slate-800" : "bg-amber-500/10"
                  )}>
                    {msg.role === "user" ? <User className="h-4 w-4 text-slate-600 dark:text-slate-300" /> : <Bot className="h-4 w-4 text-amber-500" />}
                  </div>
                  <div className={cn(
                    "px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed",
                    msg.role === "user" 
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-tr-sm" 
                      : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 shadow-sm rounded-tl-sm text-slate-700 dark:text-slate-300"
                  )}>
                    {msg.text}
                  </div>
                </motion.div>
              ))}
              
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3 mr-auto"
                >
                  <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-amber-500/10">
                    <Bot className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 shadow-sm rounded-tl-sm flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-3 bg-slate-50/80 dark:bg-black/40 backdrop-blur-md border-t border-slate-100 dark:border-white/5">
              <form onSubmit={sendMessage} className="relative flex items-center">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question about the code..."
                  className="pr-10 rounded-full bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 focus-visible:ring-amber-500 text-[13px]"
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  variant="ghost" 
                  className="absolute right-1 h-8 w-8 rounded-full text-slate-400 hover:text-amber-500 hover:bg-amber-500/10"
                  disabled={!input.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
