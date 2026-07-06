"use client";

// 단위 8a — 최소 인증(F1) + 회사 생성/선택(F2) 게이트.
// Supabase 미설정이면 status="disabled" → 호출부(page.tsx)가 기존 데모를 그대로 렌더.
// 설정되면: 로그인 → 회사 없으면 회사 생성 → 회사 있으면 데모 진입.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/client";

const COMPANY_KEY = "order-moa.companyId";
const AUTH_WAIT_MS = 6000;

export type GateStatus = "disabled" | "loading" | "signed_out" | "no_company" | "ready";

export interface CompanyRow {
  id: string;
  name: string;
}

export interface CompanySession {
  status: GateStatus;
  email: string | null;
  companies: CompanyRow[];
  companyId: string | null;
  companyName: string | null;
  error: string | null;
  info: string | null;
  busy: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  createCompany: (name: string) => Promise<void>;
  selectCompany: (id: string) => void;
}

export function useCompanySession(): CompanySession {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const [status, setStatus] = useState<GateStatus>(supabase ? "loading" : "disabled");
  const [email, setEmail] = useState<string | null>(null);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);

  const loadCompanies = useCallback(async () => {
    if (!supabase) return;
    const { data, error: qErr } = await supabase
      .from("ordermoa_companies")
      .select("id,name")
      .order("created_at", { ascending: true });
    if (!mounted.current) return;
    if (qErr) {
      setError("회사 정보를 불러오지 못했습니다.");
      setStatus("no_company");
      return;
    }
    const rows = (data ?? []) as CompanyRow[];
    setCompanies(rows);
    if (rows.length === 0) {
      setCompanyId(null);
      setStatus("no_company");
      return;
    }
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(COMPANY_KEY) : null;
    const pick = rows.find((r) => r.id === saved) ?? rows[0];
    setCompanyId(pick.id);
    setStatus("ready");
  }, [supabase]);

  useEffect(() => {
    mounted.current = true;
    if (!supabase) return;
    const timer = window.setTimeout(() => {
      if (!mounted.current) return;
      setError("로그인 상태 확인이 지연되어 로그인 화면으로 전환했습니다. 다시 시도해주세요.");
      setStatus("signed_out");
    }, AUTH_WAIT_MS);
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted.current) return;
      window.clearTimeout(timer);
      if (!session) {
        setStatus("signed_out");
        return;
      }
      setEmail(session.user.email ?? null);
      await loadCompanies();
    })();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!mounted.current) return;
      if (!session) {
        setEmail(null);
        setCompanies([]);
        setCompanyId(null);
        setStatus("signed_out");
      } else {
        setEmail(session.user.email ?? null);
        void loadCompanies();
      }
    });
    return () => {
      mounted.current = false;
      window.clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [supabase, loadCompanies]);

  const signIn = useCallback(
    async (addr: string) => {
      if (!supabase) return;
      setBusy(true);
      setError(null);
      setInfo(null);
      const { error: aErr } = await supabase.auth.signInWithOtp({
        email: addr.trim(),
        options: {
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      if (!mounted.current) return;
      setBusy(false);
      if (aErr) setError(`로그인 메일 전송에 실패했습니다: ${aErr.message}`);
      else setInfo("로그인 링크를 메일로 보냈습니다. 메일함을 확인해주세요.");
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    if (typeof window !== "undefined") window.localStorage.removeItem(COMPANY_KEY);
  }, [supabase]);

  const createCompany = useCallback(
    async (name: string) => {
      if (!supabase) return;
      setBusy(true);
      setError(null);
      const { error: rErr } = await supabase.rpc("ordermoa_create_company_with_owner", {
        p_name: name.trim(),
      });
      if (!mounted.current) return;
      setBusy(false);
      if (rErr) {
        setError("회사 생성에 실패했습니다.");
        return;
      }
      await loadCompanies();
    },
    [supabase, loadCompanies],
  );

  const selectCompany = useCallback((id: string) => {
    if (typeof window !== "undefined") window.localStorage.setItem(COMPANY_KEY, id);
    setCompanyId(id);
    setStatus("ready");
  }, []);

  const companyName = companies.find((c) => c.id === companyId)?.name ?? null;

  return {
    status,
    email,
    companies,
    companyId,
    companyName,
    error,
    info,
    busy,
    signIn,
    signOut,
    createCompany,
    selectCompany,
  };
}

export function LoginView({ session }: { session: CompanySession }) {
  const [email, setEmail] = useState("");
  return (
    <main className="gate">
      <div className="gate-box">
        <div className="brand" style={{ padding: 0, marginBottom: 14 }}>
          오더모아<small>발주 취합 MVP</small>
        </div>
        <div className="card">
        <h2>이메일로 로그인</h2>
        <p className="muted">
          이메일을 입력하면 로그인 링크를 보내드립니다. 비밀번호는 저장하지 않습니다.
        </p>
        <label>이메일</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <div className="row-actions" style={{ marginTop: 10 }}>
          <button
            className="primary"
            disabled={session.busy || email.trim() === ""}
            onClick={() => session.signIn(email)}
          >
            로그인 링크 받기
          </button>
        </div>
        {session.info && <p className="notice" style={{ marginTop: 10 }}>{session.info}</p>}
        {session.error && <p className="notice" style={{ marginTop: 10 }}>{session.error}</p>}
        </div>
      </div>
    </main>
  );
}

export function CompanySetupView({ session }: { session: CompanySession }) {
  const [name, setName] = useState("");
  return (
    <main className="gate">
      <div className="gate-box">
      <div className="brand" style={{ padding: 0, marginBottom: 14 }}>
        오더모아<small>발주 취합 MVP</small>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        {session.email ?? ""}{" "}
        <button className="link" onClick={() => session.signOut()}>
          로그아웃
        </button>
      </p>

      {session.companies.length > 0 && (
        <div className="card">
          <h2>회사 선택</h2>
          <div className="row-actions">
            {session.companies.map((c) => (
              <button key={c.id} onClick={() => session.selectCompany(c.id)}>
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2>회사 만들기</h2>
        <p className="muted">상호를 입력해 회사를 만들면 바로 사용을 시작할 수 있습니다.</p>
        <label>상호</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 오더모아상사" />
        <div className="row-actions" style={{ marginTop: 10 }}>
          <button
            className="primary"
            disabled={session.busy || name.trim() === ""}
            onClick={() => session.createCompany(name)}
          >
            회사 만들기
          </button>
        </div>
        {session.error && <p className="notice" style={{ marginTop: 10 }}>{session.error}</p>}
      </div>
      </div>
    </main>
  );
}
