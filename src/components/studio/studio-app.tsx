import { useEffect } from "react";
import { selectImagineReady, useStudio } from "@/lib/studio/store";
import { HistoryStrip } from "./history-strip";
import { ImageStage } from "./image-stage";
import { ImagineConnect } from "./imagine-connect";
import { PromptPanel } from "./prompt-panel";
import { StudioHeader } from "./studio-header";

export function StudioApp() {
  const hydrate = useStudio((s) => s.hydrate);
  const ready = useStudio((s) => s.ready);
  const imagineReady = useStudio(selectImagineReady);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <StudioHeader />
      {ready && !imagineReady ? (
        <div className="flex flex-wrap items-center justify-center gap-3 border-b border-border bg-raised/60 px-4 py-2.5 text-sm">
          <p className="text-muted">
            Connect your Grok Imagine key so plates develop on your
            subscription.
          </p>
          <ImagineConnect />
        </div>
      ) : null}
      <div className="mx-auto flex min-h-0 w-full max-w-[1480px] flex-1 flex-col lg:flex-row">
        <div className="flex min-h-[52vh] flex-1 flex-col border-b border-border lg:min-h-0 lg:border-b-0 lg:border-r">
          <ImageStage />
          <HistoryStrip />
        </div>
        <div className="flex w-full shrink-0 flex-col lg:w-[420px] xl:w-[460px]">
          {ready ? <PromptPanel /> : <PromptSkeleton />}
        </div>
      </div>
    </div>
  );
}

function PromptSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-5">
      <div className="h-3 w-28 rounded-sm bg-raised" />
      <div className="h-40 rounded-md bg-raised" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-14 rounded-md bg-raised" />
        <div className="h-14 rounded-md bg-raised" />
        <div className="h-14 rounded-md bg-raised" />
        <div className="h-14 rounded-md bg-raised" />
      </div>
    </div>
  );
}
