import { Injectable, Logger } from "@nestjs/common";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

@Injectable()
export class OpenAiService {
  private readonly logger = new Logger(OpenAiService.name);

  private apiKey(): string {
    const key = process.env.OPENAI_API_KEY;
    if (!key || key === "sk-your-key-here") {
      throw new Error(
        "OPENAI_API_KEY is not set. Add it to your .env file (see .env.example) and restart the API.",
      );
    }
    return key;
  }

  private model(): string {
    return process.env.OPENAI_MODEL || "gpt-4o-mini";
  }

  /**
   * Streams a chat completion, invoking onDelta for each text chunk as it arrives.
   */
  async streamChat(messages: ChatMessage[], onDelta: (text: string) => void): Promise<void> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey()}`,
      },
      body: JSON.stringify({
        model: this.model(),
        messages,
        stream: true,
        temperature: 0.4,
      }),
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenAI request failed (${res.status}): ${text}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") return;
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) onDelta(delta);
        } catch (err) {
          this.logger.warn(`Could not parse stream chunk: ${payload}`);
        }
      }
    }
  }

  /**
   * Non-streaming completion used for quiz generation (expects a JSON object back).
   */
  async completeJson(messages: ChatMessage[]): Promise<any> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey()}`,
      },
      body: JSON.stringify({
        model: this.model(),
        messages,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenAI request failed (${res.status}): ${text}`);
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
    return JSON.parse(content);
  }
}
