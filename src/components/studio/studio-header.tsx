import { Link } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { Badge } from "@/components/ui/badge";
import { selectImagineReady, useStudio } from "@/lib/studio/store";
import { ImagineConnect } from "./imagine-connect";

export function StudioHeader() {
  const { user, isPending } = useCurrentUserState();
  const frames = useStudio((s) => s.frames);
  const status = useStudio((s) => s.status);
  const imagineReady = useStudio(selectImagineReady);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Link to="/" className="flex items-center gap-2.5 text-fg">
          <span
            aria-hidden
            className="grid size-7 place-items-center rounded-sm bg-raised shadow-[var(--shadow-border)]"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none">
              <path
                d="M8 1.6 14.4 8 8 14.4 1.6 8 Z"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <circle cx="8" cy="8" r="1.5" fill="currentColor" />
            </svg>
          </span>
          <span className="font-display text-xl italic leading-none tracking-tight">
            Halide
          </span>
        </Link>
        <span className="hidden text-sm text-subtle sm:inline">
          Prompt and plate, live.
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {status !== "idle" ? (
          <Badge variant="warn">
            {status === "translating" ? "Translating" : "Imagine"}
          </Badge>
        ) : imagineReady ? (
          <Badge variant="ok">Imagine 2.0</Badge>
        ) : (
          <Badge variant="warn">Imagine off</Badge>
        )}
        {imagineReady ? <ImagineConnect compact /> : null}
        <Badge className="hidden sm:inline-flex">
          {frames.length} plate{frames.length === 1 ? "" : "s"}
        </Badge>

        {isPending ? (
          <div className="size-8 animate-pulse rounded-full bg-raised" />
        ) : (
          <>
            <SignedOut>
              <Link
                to="/login"
                className="inline-flex h-9 items-center rounded-sm px-3 text-sm text-muted transition-colors duration-150 hover:text-fg"
              >
                Sign in
              </Link>
            </SignedOut>
            <SignedIn>
              <div className="hidden sm:block">
                <UserButton />
              </div>
              {user ? (
                <div className="sm:hidden">
                  {user.profileImageUrl ? (
                    <img
                      src={user.profileImageUrl}
                      alt=""
                      className="size-8 rounded-full object-cover outline outline-1 -outline-offset-1 outline-border-strong"
                    />
                  ) : (
                    <span className="grid size-8 place-items-center rounded-full bg-raised text-xs">
                      {(user.displayName ?? "A").charAt(0)}
                    </span>
                  )}
                </div>
              ) : null}
            </SignedIn>
          </>
        )}
      </div>
    </header>
  );
}
