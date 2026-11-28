import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TelegramMessage = {
  message_id: number;
  chat: { id: number };
  text?: string;
};
type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: {
    id: string;
    data?: string;
    message?: TelegramMessage;
  };
};

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const WHATSAPP_NUMBER = "971541797541";

const menu = {
  inline_keyboard: [
    [{ text: "💱 Exchange Rates", callback_data: "rates" }, { text: "🌍 Explore Countries", callback_data: "countries" }],
    [{ text: "💸 How to Send Money", callback_data: "send" }, { text: "📝 Register / Login", callback_data: "account" }],
    [{ text: "📦 Transfer Status", callback_data: "status" }, { text: "❓ FAQs", callback_data: "faq" }],
    [{ text: "👩‍💼 Contact Live Agent", callback_data: "agent" }],
  ],
};

async function telegram(method: string, body: Record<string, unknown>) {
  if (!BOT_TOKEN) throw new Error("Telegram bot is not configured");
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Telegram API request failed: ${response.status}`);
  return response.json();
}

async function sendMessage(chatId: number, text: string, replyMarkup?: unknown) {
  return telegram("sendMessage", {
    chat_id: chatId,
    text,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    disable_web_page_preview: true,
  });
}

async function answer(update: TelegramUpdate, origin: string) {
  const message = update.message ?? update.callback_query?.message;
  if (!message) return;
  const chatId = message.chat.id;
  const action = update.callback_query?.data ?? (update.message?.text ?? "").trim().toLowerCase();

  if (update.callback_query) {
    await telegram("answerCallbackQuery", { callback_query_id: update.callback_query.id });
  }

  if (["/start", "/menu", "menu", "hi", "hello", "start"].includes(action)) {
    await sendMessage(
      chatId,
      "Welcome to DirhamLink 👋\n\nI can help you explore indicative exchange rates, destination guides and the remittance inquiry process. Choose an option below.",
      menu
    );
    return;
  }

  if (action === "rates" || action === "💱 exchange rates") {
    try {
      const response = await fetch(new URL("/api/rates", origin), { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.customer_rates) throw new Error("Rates unavailable");
      const codes = ["INR", "PKR", "NPR", "BDT", "EGP", "PHP", "LKR", "IDR", "THB", "VND", "CNY", "UGX"];
      const lines = codes
        .filter((code) => data.customer_rates[code] != null)
        .map((code) => `1 AED ≈ ${Number(data.customer_rates[code]).toFixed(4)} ${code}`);
      await sendMessage(
        chatId,
        `Indicative DirhamLink reference rates\n\n${lines.join("\n")}\n\nRates can change and are not a guaranteed offer. Our team must confirm the applicable rate, fees, payout availability and final amount before any transfer.`,
        menu
      );
    } catch {
      await sendMessage(chatId, "Sorry, live reference rates are temporarily unavailable. Please visit the DirhamLink website and try again shortly.", menu);
    }
    return;
  }

  if (action === "countries" || action === "🌍 explore countries") {
    const countries = [
      ["🇮🇳 India", "india"], ["🇵🇰 Pakistan", "pakistan"], ["🇳🇵 Nepal", "nepal"],
      ["🇧🇩 Bangladesh", "bangladesh"], ["🇪🇬 Egypt", "egypt"], ["🇵🇭 Philippines", "philippines"],
    ];
    const keyboard = {
      inline_keyboard: [
        ...countries.map(([label, slug]) => [{ text: label, url: `${origin}/destinations/${slug}` }]),
        [{ text: "⬅️ Main Menu", callback_data: "menu" }],
      ],
    };
    await sendMessage(chatId, "Choose a destination to view its country guide, popular places, foods, sports and remittance information.", keyboard);
    return;
  }

  if (action === "send" || action === "💸 how to send money") {
    await sendMessage(
      chatId,
      "How to make a remittance inquiry:\n1. Register or log in to your DirhamLink profile.\n2. Choose your destination and enter the requested transfer details.\n3. Submit your inquiry.\n4. Our team will contact you to confirm the process, applicable rate, fees, checks and available payout method.\n\nSubmitting an inquiry does not itself execute or guarantee a transfer.",
      { inline_keyboard: [[{ text: "Open DirhamLink", url: origin }], [{ text: "Main Menu", callback_data: "menu" }]] }
    );
    return;
  }

  if (action === "account" || action === "📝 register / login") {
    await sendMessage(chatId, "You can create an account or sign in securely on the DirhamLink website. Do not send passwords or one-time codes in this Telegram chat.", {
      inline_keyboard: [
        [{ text: "Register", url: `${origin}/register` }, { text: "Log in", url: `${origin}/login` }],
        [{ text: "Main Menu", callback_data: "menu" }],
      ],
    });
    return;
  }

  if (action === "status" || action === "📦 transfer status") {
    await sendMessage(chatId, "For privacy, view your transfer inquiry status after signing in to your DirhamLink customer profile. I cannot verify account-specific transfer records in Telegram yet.", {
      inline_keyboard: [[{ text: "Customer Login", url: `${origin}/login` }], [{ text: "Main Menu", callback_data: "menu" }]],
    });
    return;
  }

  if (action === "faq" || action === "❓ faqs") {
    await sendMessage(
      chatId,
      "Frequently asked questions\n\n• Are the rates final? No. They are indicative until confirmed by DirhamLink staff.\n• Is submitting an inquiry a completed transfer? No. It is a request for assistance.\n• When will my beneficiary receive money? Timing depends on checks, provider availability and the selected payout method.\n• Can I send bank details here? Please use your secure DirhamLink profile. Never share passwords, OTPs or full card details in chat.",
      menu
    );
    return;
  }

  if (action === "agent" || action === "👩‍💼 contact live agent") {
    const messageText = "Hello DirhamLink team, I came from your Telegram support bot and would like to speak to a live agent.";
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(messageText)}`;
    await sendMessage(chatId, "A live agent can continue helping you on WhatsApp Business. Your Telegram conversation is not automatically transferred to WhatsApp, so please briefly explain your question again there.", {
      inline_keyboard: [[{ text: "Chat with DirhamLink on WhatsApp", url: waUrl }], [{ text: "Main Menu", callback_data: "menu" }]],
    });
    return;
  }

  await sendMessage(chatId, "Please choose an option from the DirhamLink support menu.", menu);
}

export async function POST(request: Request) {
  if (!BOT_TOKEN || !WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Telegram webhook is not configured." }, { status: 503 });
  }
  if (request.headers.get("x-telegram-bot-api-secret-token") !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: TelegramUpdate | undefined;
  try {
    update = (await request.json()) as TelegramUpdate;
    console.log("[telegram-webhook] Update received", { updateId: update.update_id, hasMessage: Boolean(update.message), hasCallback: Boolean(update.callback_query) });
    await answer(update, new URL(request.url).origin);
    console.log("[telegram-webhook] Update processed", { updateId: update.update_id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[telegram-webhook] Update processing failed", { updateId: update?.update_id, error: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ error: "Unable to process Telegram update." }, { status: 500 });
  }
}
