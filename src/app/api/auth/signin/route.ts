import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { email, password } = body;

  const result = await auth.emailAndPassword.signIn({
    email,
    password,
  });

  return NextResponse.json(result);
}
