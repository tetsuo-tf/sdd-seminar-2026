import type { Category, Status } from "./types";

export const STATUS_LABELS: Record<Status, string> = {
  open: "受付済",
  in_progress: "対応中",
  done: "完了",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  hardware: "ハードウェア",
  software: "ソフトウェア",
  account: "アカウント",
  network: "ネットワーク",
  other: "その他",
};
