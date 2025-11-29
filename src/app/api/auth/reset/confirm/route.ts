import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { token, newPassword } = await req.json();

  const result = await auth.emailAndPassword.resetPassword({
    token,
    newPassword,
  });

  return NextResponse.json(result);
}
