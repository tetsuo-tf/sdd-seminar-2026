import type { ReactNode } from "react";

interface FieldErrorProps {
  children?: ReactNode;
}

export function FieldError({ children }: FieldErrorProps) {
  if (!children) return null;
  return <p className="text-sm text-red-600 mt-1">{children}</p>;
}
