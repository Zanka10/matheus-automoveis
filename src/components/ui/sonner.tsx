"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      toastOptions={{ classNames: { toast: "rounded-xl font-sans", title: "font-medium" } }}
      {...props}
    />
  );
}

export { toast } from "sonner";
