"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  { q: "What programming languages are supported?", a: "Anuvaad supports Python, JavaScript, Java, C++, TypeScript, Rust, and Go. We're adding more languages regularly." },
  { q: "Is my code stored on your servers?", a: "No. Your code is processed in real-time by the AI and returned to your browser immediately. We never store code on our servers. Translation history is saved locally in your browser." },
  { q: "How accurate are the translations?", a: "Anuvaad uses Google's Gemini 2.5 Flash, which provides highly accurate translations. However, AI translations should always be reviewed before use in production environments." },
  { q: "Can I use Anuvaad for free?", a: "Yes! The free plan includes 10 translations per day, all 3 modes, and full export capabilities. No credit card required." },
  { q: "What's the difference between Free and Pro?", a: "Pro gives you unlimited translations, priority processing speed, larger input limits (50K characters), cloud-synced history, and email support." },
  { q: "Can I cancel my subscription anytime?", a: "Absolutely. You can cancel your Pro subscription at any time. Your access continues until the end of your current billing period. We also offer a 7-day refund policy." },
];

export function FAQ() {
  return (
    <section id="faq" className="border-t border-border/40 bg-muted/30 py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-600">FAQ</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Frequently asked questions</h2>
        </div>
        <Accordion className="mt-12">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-base font-medium">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
