"use client";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function highlight(json: string) {
  const re = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?)/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(json))) {
    if (m.index > last) out.push(json.slice(last, m.index));
    const [full, str, colon, lit, num] = m;
    if (str && colon) out.push(<span key={i++} className="text-indigo-700">{str}</span>, colon);
    else if (str) out.push(<span key={i++} className="text-emerald-700">{str}</span>);
    else if (lit) out.push(<span key={i++} className="text-amber-700">{full}</span>);
    else if (num) out.push(<span key={i++} className="text-sky-700">{full}</span>);
    last = m.index + full.length;
  }
  out.push(json.slice(last));
  return out;
}

export function JsonView({ data, empty }: { data: unknown; empty?: string }) {
  const [copied, setCopied] = useState(false);
  if (data === null || data === undefined) {
    return <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">{empty ?? "Nothing recorded."}</p>;
  }
  const text = JSON.stringify(data, null, 2);
  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="absolute top-2 right-2 h-7 bg-background/80"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            toast.error("Could not copy to clipboard");
          }
        }}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy"}
      </Button>
      <pre className="max-h-80 overflow-auto rounded-md border bg-zinc-50 p-3 pr-20 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
        {highlight(text)}
      </pre>
    </div>
  );
}
