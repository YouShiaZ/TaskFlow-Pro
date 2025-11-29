import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  const { email, password, name } = body;

  const result = await auth.emailAndPassword.signUp({
    email,
    password,
    name,
  });

  return NextResponse.json(result);
}
