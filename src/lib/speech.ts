"use client";

import { SPEECH_LANG, type Locale } from "@/i18n/config";

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const base = lang.split("-")[0];
  return (
    voices.find((v) => v.lang.replace("_", "-").toLowerCase() === lang.toLowerCase()) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(base))
  );
}

/** Lê o texto em voz alta. Retorna false se o aparelho não tiver voz disponível. */
export function speak(text: string, locale: Locale, onEnd?: () => void): boolean {
  if (!isSpeechSupported()) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const lang = SPEECH_LANG[locale];
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.92;
  const voice = pickVoice(lang);
  if (voice) utterance.voice = voice;
  else if (synth.getVoices().length > 0 && !voice) {
    // Há vozes, mas nenhuma para este idioma
    return false;
  }
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  synth.speak(utterance);
  return true;
}

export function stopSpeaking() {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      el.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export async function shareText(text: string, title?: string): Promise<"shared" | "copied" | "failed"> {
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await navigator.share({ text, title });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "failed";
    }
  }
  return (await copyText(text)) ? "copied" : "failed";
}
