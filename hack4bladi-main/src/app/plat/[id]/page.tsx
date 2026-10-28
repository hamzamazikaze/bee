import { notFound } from "next/navigation";
import { DISHES } from "@/features/benna/data";
import { MealScreen } from "@/features/benna/meal-screen";

export function generateStaticParams() {
  return DISHES.map((dish) => ({ id: dish.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!DISHES.some((dish) => dish.id === id)) notFound();
  return <MealScreen id={id} />;
}
