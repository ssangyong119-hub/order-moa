// Supabase 공개 환경변수 접근 (브라우저 노출 가능한 anon 설정만).
// 환경변수가 없으면 null → 앱은 Supabase 없이 데모 모드로 동작(깨지지 않음).
// 함수로 노출해 호출 시점에 읽는다(테스트에서 process.env 조작 가능).

export interface PublicSupabaseEnv {
  url: string;
  anonKey: string;
}

export function getPublicSupabaseEnv(): PublicSupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return getPublicSupabaseEnv() !== null;
}
