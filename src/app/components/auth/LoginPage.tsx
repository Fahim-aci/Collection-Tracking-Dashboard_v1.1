import image_Aci_Group_Logo_80x80_1 from '@/imports/Aci-Group-Logo-80x80-1.png'
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-[#0F1117]"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-[420px] mx-4">
        {/* Card */}
        <div className="bg-[#1A1D27] border border-[#2A2D3A] rounded-2xl shadow-2xl overflow-hidden">
          {/* Header band */}
          <div className="bg-gradient-to-r from-[#E91922] to-[#B8131A] px-8 py-6 flex items-center gap-4">
            {/* ACI logo */}
            <div className="shrink-0 size-[48px] bg-white rounded-xl flex items-center justify-center shadow-lg">
              <img
                src={image_Aci_Group_Logo_80x80_1}
                alt="ACI Group"
                className="size-[36px] object-contain"
              />
            </div>
            <div>
              <p className="text-white text-[11px] font-semibold uppercase tracking-[0.12em] opacity-80">
                ACI Group
              </p>
              <h1 className="text-white text-[20px] font-bold leading-tight">
                Collection Dashboard
              </h1>
            </div>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <p className="text-[#9BA3AF] text-[13px] mb-6">
              Sign in with your credentials to access the dashboard.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-[#D1D5DB] uppercase tracking-wider">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="email@aci-bd.com"
                  className="h-[44px] w-full px-4 text-[14px] text-white bg-[#0F1117] border border-[#2A2D3A] rounded-xl outline-none focus:border-[#E91922] transition-colors placeholder:text-[#4B5563]"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-[#D1D5DB] uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="h-[44px] w-full px-4 pr-11 text-[14px] text-white bg-[#0F1117] border border-[#2A2D3A] rounded-xl outline-none focus:border-[#E91922] transition-colors placeholder:text-[#4B5563]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4B5563] hover:text-[#9BA3AF] transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-[#2D1515] border border-[#5C1F1F] rounded-xl">
                  <span className="text-[#F87171] text-[13px] leading-snug">{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 h-[46px] w-full bg-[#E91922] text-white text-[14px] font-semibold rounded-xl hover:bg-[#C8141C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#E91922]/20"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin size-4"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    Signing in…
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 border-t border-[#2A2D3A] text-center">
            <p className="text-[11px] text-[#4B5563]">
              ACI Group · Collection Management System · {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
