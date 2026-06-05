import { redirect } from "next/navigation";
import { signout } from "@/app/(auth)/actions";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { Button } from "@/components/ui/button";
import { getCurrentRestaurant } from "@/lib/restaurant";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const restaurant = await getCurrentRestaurant();
  if (!restaurant) redirect("/login");

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Dashboard</p>
              <h1 className="text-base font-semibold leading-tight">
                {restaurant.name}
              </h1>
            </div>
            <DashboardNav />
          </div>
          <form action={signout}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
