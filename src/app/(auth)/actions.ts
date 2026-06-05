"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error: string } | null;

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo =
    String(formData.get("redirectTo") ?? "").trim() || "/dashboard/menu";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const restaurantName = String(formData.get("restaurantName") ?? "").trim();

  if (!restaurantName) return { error: "Please enter your restaurant name." };
  if (password.length < 6)
    return { error: "Password must be at least 6 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { restaurant_name: restaurantName } },
  });
  if (error) return { error: error.message };

  // When email confirmation is enabled there is no session yet.
  if (!data.session) {
    redirect(
      "/login?message=" +
        encodeURIComponent(
          "Check your email to confirm your account, then sign in.",
        ),
    );
  }

  revalidatePath("/", "layout");
  redirect("/dashboard/menu");
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
