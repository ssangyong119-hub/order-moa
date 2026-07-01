// 서버용 Supabase 클라이언트 (Server Action / Route Handler 전용).
// anon 키 + 요청 쿠키로 세션 유지. service role key는 여기서도 쓰지 않는다(별도 관리).
// 단위 8a에서는 인증/회사 흐름을 클라이언트에서 처리하므로 아직 호출부가 없다(다음 단위 대비 준비물).
// 주의: next/headers 사용 → 서버 컴포넌트/액션에서만 import할 것(클라이언트 번들 금지).
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicSupabaseEnv } from "./config";

export async function getServerSupabase() {
  const env = getPublicSupabaseEnv();
  if (!env) return null;
  const cookieStore = await cookies();
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // 서버 컴포넌트에서 호출되면 set이 불가할 수 있음 — 미들웨어/액션에서 갱신 (다음 단위)
        }
      },
    },
  });
}
