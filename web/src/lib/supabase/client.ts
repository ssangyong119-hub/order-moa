// 브라우저용 Supabase 클라이언트 (anon 키, RLS 적용).
// 환경변수 미설정 시 null 반환 → 호출부가 데모 모드로 폴백한다.
"use client";
import { createBrowserClient } from "@supabase/ssr";
import { getPublicSupabaseEnv } from "./config";

type BrowserClient = ReturnType<typeof createBrowserClient>;
let cached: BrowserClient | null = null;

export function getBrowserSupabase(): BrowserClient | null {
  const env = getPublicSupabaseEnv();
  if (!env) return null;
  if (!cached) {
    cached = createBrowserClient(env.url, env.anonKey);
  }
  return cached;
}
