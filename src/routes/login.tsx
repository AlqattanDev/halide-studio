import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="film-grain grid min-h-dvh place-items-center bg-bg px-6 text-fg">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-10 flex items-center gap-2.5 text-fg">
          <span className="grid size-8 place-items-center rounded-sm bg-raised shadow-[var(--shadow-border)]">
            <svg viewBox="0 0 16 16" className="size-4" fill="none">
              <path
                d="M8 1.6 14.4 8 8 14.4 1.6 8 Z"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <circle cx="8" cy="8" r="1.5" fill="currentColor" />
            </svg>
          </span>
          <span className="font-display text-2xl italic tracking-tight">
            Halide
          </span>
        </Link>
        <h1 className="font-display text-4xl italic tracking-tight">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-muted">
          Optional. The darkroom works either way — sign in if you want an
          account on this plate.
        </p>
        <div className="mt-8 space-y-2">
          {authEnabled ? (
            GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
              >
                Continue with {p.label}
              </Button>
            ))
          ) : (
            <p className="text-sm text-muted">Sign-in is disabled.</p>
          )}
        </div>
        <Link
          to="/"
          className="mt-6 inline-block text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
        >
          Back to the studio
        </Link>
      </div>
    </main>
  );
}
