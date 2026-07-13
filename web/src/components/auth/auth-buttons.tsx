"use client";

import Link from "next/link";
import {
  SignInButton,
  SignUpButton,
  Show,
  UserButton,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function AuthButtons({
  size = "default",
}: {
  size?: "default" | "sm" | "lg";
}) {
  return (
    <>
      <Show when="signed-out">
        <div className="flex items-center gap-2">
          <SignInButton mode="modal">
            <Button variant="ghost" size={size}>
              Sign in
            </Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button size={size}>Get started</Button>
          </SignUpButton>
        </div>
      </Show>
      <Show when="signed-in">
        <div className="flex items-center gap-3">
          <Button asChild variant="secondary" size={size}>
            <Link href="/app">Dashboard</Link>
          </Button>
          <UserButton />
        </div>
      </Show>
    </>
  );
}

export function HeroCta() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Show when="signed-out">
        <SignUpButton mode="modal">
          <Button size="lg">Start free</Button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <Button asChild size="lg">
          <Link href="/app">Open dashboard</Link>
        </Button>
      </Show>
      <Button asChild variant="outline" size="lg">
        <Link href="#products">Explore products</Link>
      </Button>
    </div>
  );
}
