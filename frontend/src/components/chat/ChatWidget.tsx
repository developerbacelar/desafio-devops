"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { fetchCompanies } from "@/lib/api";
import { useChatSession } from "@/hooks/useChatSession";
import { usePostMessageBridge } from "@/hooks/usePostMessageBridge";
import type { Company } from "@/lib/types";
import { Launcher } from "./Launcher";
import { ChatPanel } from "./ChatPanel";

const FLOATING_WIDTH = 360;
const FLOATING_HEIGHT = 520;
const CLOSED_SIZE = 72;
const FOCUSABLE_SELECTOR = 'button, textarea, [href], input, select, [tabindex]:not([tabindex="-1"])';

export interface ChatWidgetProps {
  companySlug: string;
}

export function ChatWidget({ companySlug }: ChatWidgetProps) {
  const [company, setCompany] = useState<Company | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const { messages, status, error, sendMessage, retry, reset } = useChatSession(companySlug);
  const { notifyResize } = usePostMessageBridge();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isFirstFocusPass = useRef(true);

  useEffect(() => {
    let active = true;
    fetchCompanies()
      .then((companies) => {
        if (!active) return;
        setCompany(companies.find((c) => c.slug === companySlug) ?? null);
      })
      .catch(() => {
        if (active) setCompany(null);
      });
    return () => {
      active = false;
    };
  }, [companySlug]);

  useEffect(() => {
    // So o tamanho "preferido" quando aberto (floating) e enviado aqui. Se o
    // viewport da pagina hospedeira for estreito, quem decide usar fullscreen
    // no lugar e o widget.js (ele conhece o viewport real; o iframe nao).
    if (open) {
      notifyResize({ state: "open", width: FLOATING_WIDTH, height: FLOATING_HEIGHT });
    } else {
      notifyResize({ state: "closed", width: CLOSED_SIZE, height: CLOSED_SIZE });
    }
  }, [open, notifyResize]);

  useEffect(() => {
    if (isFirstFocusPass.current) {
      isFirstFocusPass.current = false;
      return;
    }
    if (open) {
      composerRef.current?.focus();
    } else {
      launcherRef.current?.focus();
    }
  }, [open]);

  function handleClose() {
    setOpen(false);
    reset();
  }

  function handlePanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      handleClose();
      return;
    }
    if (event.key !== "Tab" || !panelRef.current) return;

    const focusables = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (el) => !el.hasAttribute("disabled"),
    );
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!company) {
    return null;
  }

  if (!open) {
    return (
      <Launcher
        ref={launcherRef}
        companyName={company.name}
        primaryColor={company.primaryColor}
        logoUrl={company.logoUrl}
        onClick={() => setOpen(true)}
      />
    );
  }

  return (
    <div ref={panelRef} onKeyDown={handlePanelKeyDown} className="fixed inset-0 h-full w-full">
      <ChatPanel
        companyName={company.name}
        primaryColor={company.primaryColor}
        logoUrl={company.logoUrl}
        messages={messages}
        status={status}
        error={error}
        onClose={handleClose}
        onSend={sendMessage}
        onRetry={retry}
        composerRef={composerRef}
      />
    </div>
  );
}
