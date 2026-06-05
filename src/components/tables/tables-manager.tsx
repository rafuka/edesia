"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { addTables } from "@/app/dashboard/tables/actions";
import { TableQR } from "@/components/tables/table-qr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RestaurantTable } from "@/lib/types";

export function TablesManager({
  slug,
  tables,
}: {
  slug: string;
  tables: RestaurantTable[];
}) {
  const router = useRouter();
  const [count, setCount] = useState("1");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const n = Number(count);
    if (!Number.isInteger(n) || n < 1) {
      toast.error("Enter a whole number of tables to add.");
      return;
    }

    setSubmitting(true);
    const result = await addTables(n);
    setSubmitting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(n === 1 ? "Table added" : `${n} tables added`);
    setCount("1");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tables</h1>
        <p className="text-sm text-muted-foreground">
          Add dining tables to your restaurant.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-3 rounded-xl border bg-background p-4"
      >
        <div className="space-y-2">
          <Label htmlFor="count">Number of tables to add</Label>
          <Input
            id="count"
            type="number"
            min={1}
            max={100}
            step={1}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className="w-40"
          />
        </div>
        <Button type="submit" disabled={submitting}>
          <Plus className="mr-2 h-4 w-4" />
          {submitting ? "Adding…" : "Add tables"}
        </Button>
      </form>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          {tables.length} {tables.length === 1 ? "table" : "tables"}
        </h2>

        {tables.length > 0 ? (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3">
            {tables.map((table) => (
              <TableQR key={table.id} slug={slug} number={table.number} />
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
            <h3 className="text-lg font-semibold">No tables yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Enter how many tables you have and add them all at once.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
