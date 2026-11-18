import { toast } from "sonner";
export const comingSoon = (what?: string) =>
  toast("Coming soon", { description: what ? `${what} isn't part of this demo yet.` : "This isn't part of the demo yet." });
