import type { LLMCompletionRequest, LLMCompletionResult } from "@/platform/types";

/**
 * Vendor-swappable LLM port.
 * v1: DeepSeek · later: OpenAI / Anthropic without changing callers.
 */
export interface LLMProvider {
  readonly name: string;
  complete(req: LLMCompletionRequest): Promise<LLMCompletionResult>;
}

export class DeepSeekProvider implements LLMProvider {
  readonly name = "deepseek";

  constructor(
    private readonly apiKey: string | undefined = process.env.DEEPSEEK_API_KEY,
    private readonly baseUrl = process.env.DEEPSEEK_BASE_URL ??
      "https://api.deepseek.com",
  ) {}

  async complete(req: LLMCompletionRequest): Promise<LLMCompletionResult> {
    if (!this.apiKey) {
      throw new Error("DEEPSEEK_API_KEY is not configured");
    }

    const model = req.model ?? process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: req.messages,
        temperature: req.temperature ?? 0.2,
        max_tokens: req.maxTokens ?? 4096,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`DeepSeek error ${res.status}: ${body}`);
    }

    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      model?: string;
    };

    return {
      content: data.choices[0]?.message?.content ?? "",
      model: data.model ?? model,
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      provider: this.name,
    };
  }
}

let singleton: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (!singleton) {
    singleton = new DeepSeekProvider();
  }
  return singleton;
}
