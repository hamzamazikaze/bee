import { notFound } from "next/navigation";
import { INTERESTS, type Interest } from "@/types/profile";
/* Imported straight from the module, not the feature barrel: the barrel re-exports the
   icon table, and pulling @phosphor-icons into a server component breaks the RSC graph
   (`createContext is not a function`). The screen itself is a client boundary. */
import { CategoryScreen } from "@/features/explore/category-screen";

/** Six shelves, known at build time — the dataset's own six categories. */
export function generateStaticParams() {
  return INTERESTS.map((category) => ({ category }));
}

export default async function Page({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!INTERESTS.includes(category as Interest)) notFound();
  return <CategoryScreen id={category} />;
}
