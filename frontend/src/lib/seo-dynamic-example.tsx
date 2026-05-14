import { Metadata } from 'next';

// ----------------------------------------------------------------------------------
// This file serves as a reference pattern for implementing dynamic SEO metadata.
// 
// When you create dynamic routes in the future (e.g., /translate/[language]/page.tsx),
// you can copy this pattern to dynamically generate SEO tags based on route params.
// ----------------------------------------------------------------------------------

type Props = {
  params: { language: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

// 1. Next.js natively calls generateMetadata BEFORE rendering the page component
export async function generateMetadata(
  { params, searchParams }: Props
): Promise<Metadata> {
  // Read route params (e.g. "python")
  const lang = params.language;

  // Capitalize the language name for nice display
  const formattedLang = lang.charAt(0).toUpperCase() + lang.slice(1);

  // Optional: Fetch dynamic data from the backend or database
  // const langData = await fetch(`https://api.anuvaad.dev/langs/${lang}`).then(res => res.json());

  return {
    // Dynamically override the template title from layout.tsx
    title: `Translate ${formattedLang} to English`,
    
    // Customize the description for better CTR in Google Search
    description: `Instantly understand any ${formattedLang} codebase. Translate ${formattedLang} into plain English, or convert it to 35+ other languages using Anuvaad.`,
    
    // Update the open graph image dynamically if your endpoint supports it
    openGraph: {
      images: [`/opengraph-image?lang=${lang}`],
    },
    
    // Explicit canonical to avoid duplicate content penalties 
    // if the same language appears on multiple query-parameter URLs
    alternates: {
      canonical: `/translate/${lang}`,
    },
  };
}

// 2. Your actual Server Component (cannot use 'use client' if exporting generateMetadata directly)
export default async function DynamicLanguagePage({ params }: Props) {
  return (
    <div>
      <h1>Translate {params.language}</h1>
      {/* ... page content ... */}
    </div>
  );
}
