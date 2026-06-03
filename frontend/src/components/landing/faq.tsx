"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

const faqs = [
  { q: "What programming languages are supported?", a: "Anuvaad supports 35+ languages including Python, JavaScript, TypeScript, Java, C++, C#, Go, Rust, Swift, Kotlin, PHP, Ruby, SQL, HTML, CSS, Dart, Lua, R, Haskell, and more. We're adding new languages regularly." },
  { q: "Is my code stored on your servers?", a: "No. Your code is processed in real-time by the AI and returned to your browser immediately. We never store code on our servers. Translation history is saved securely in your account database." },
  { q: "How accurate are the translations?", a: "Anuvaad uses Groq and DeepSeek, which provide highly accurate translations. However, AI translations should always be reviewed before use in production environments." },
  { q: "Can I use Anuvaad for free?", a: "Yes! The free plan includes 10 translations per day, all 3 modes, and full export capabilities. No credit card required." },
  { q: "What's the difference between Free and Pro?", a: "Pro gives you unlimited translations, priority processing speed, larger input limits (50K characters), cloud-synced history, and email support." },
  { q: "Can I cancel my subscription anytime?", a: "Absolutely. You can cancel your Pro subscription at any time. Your access continues until the end of your current billing period. We also offer a 7-day refund policy." },
];

export function FAQ() {
  return (
    <section className="relative border-t border-white/5 py-32 bg-transparent">
      <div className="mx-auto max-w-3xl px-6">
        <div className="cinematic-reveal text-center">
          <Badge
            variant="secondary"
            className="mb-4 border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-indigo-400"
          >
            FAQ
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl text-white">
            Frequently asked questions
          </h2>
        </div>
        
        <div className="cinematic-reveal mt-16 rounded-2xl border border-white/5 bg-[#060613]/50 p-6 backdrop-blur-md shadow-2xl shadow-black/40">
          <Accordion className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-b border-white/5 last:border-b-0">
                <AccordionTrigger className="text-left text-sm font-semibold tracking-wide text-slate-200 hover:text-white hover:no-underline transition-colors py-4">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-slate-400 text-xs leading-relaxed pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
