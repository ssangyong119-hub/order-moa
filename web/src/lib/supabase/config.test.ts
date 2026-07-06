import { afterEach, expect, test } from "vitest";
import { getPublicSupabaseEnv, isDevDemoAvailable, isSupabaseConfigured } from "./config";

const OLD_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const OLD_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

afterEach(() => {
  if (OLD_URL === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = OLD_URL;
  if (OLD_KEY === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = OLD_KEY;
});

test("환경변수 미설정이면 null / false (데모 모드 폴백)", () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  expect(getPublicSupabaseEnv()).toBe(null);
  expect(isSupabaseConfigured()).toBe(false);
});

test("url+anon 둘 다 있으면 설정됨", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://demo.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  expect(isSupabaseConfigured()).toBe(true);
  expect(getPublicSupabaseEnv()).toEqual({ url: "https://demo.supabase.co", anonKey: "anon-key" });
});

test("한쪽만 있으면 미설정 취급", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://demo.supabase.co";
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  expect(isSupabaseConfigured()).toBe(false);
});

test("개발용 데모 진입은 development에서만 허용", () => {
  expect(isDevDemoAvailable("development")).toBe(true);
  expect(isDevDemoAvailable("test")).toBe(true);
  expect(isDevDemoAvailable("production")).toBe(false);
});
