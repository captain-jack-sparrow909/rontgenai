import {
  initializePaddle,
  type Paddle,
  type Environments,
} from "@paddle/paddle-js";

let paddlePromise: Promise<Paddle | undefined> | null = null;

function paddleEnvironment(): Environments {
  const env = process.env.NEXT_PUBLIC_PADDLE_ENV ?? process.env.PADDLE_ENV;
  if (env === "production" || env === "live") return "production";
  // Client tokens starting with test_ imply sandbox
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? "";
  if (token.startsWith("live_")) return "production";
  return "sandbox";
}

/** Singleton Paddle.js instance for browser checkout. */
export function getPaddle(): Promise<Paddle | undefined> {
  if (typeof window === "undefined") {
    return Promise.resolve(undefined);
  }

  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  if (!token) {
    return Promise.resolve(undefined);
  }

  if (!paddlePromise) {
    paddlePromise = initializePaddle({
      token,
      environment: paddleEnvironment(),
    }).catch((err) => {
      console.error("[Paddle] init failed", err);
      paddlePromise = null;
      return undefined;
    });
  }

  return paddlePromise;
}

export async function openPaddleCheckout(opts: {
  priceId: string;
  email?: string | null;
  customData: Record<string, string>;
  successUrl: string;
}): Promise<{ opened: boolean; reason?: string }> {
  const paddle = await getPaddle();
  if (!paddle) {
    return {
      opened: false,
      reason:
        "Paddle.js not available. Set NEXT_PUBLIC_PADDLE_CLIENT_TOKEN (test_… for sandbox).",
    };
  }

  paddle.Checkout.open({
    items: [{ priceId: opts.priceId, quantity: 1 }],
    customer: opts.email ? { email: opts.email } : undefined,
    customData: opts.customData,
    settings: {
      successUrl: opts.successUrl,
      allowLogout: false,
    },
  });

  return { opened: true };
}
