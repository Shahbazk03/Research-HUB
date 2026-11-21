import React from "react";
import { MessageCircle } from "lucide-react";
import { useSettings, whatsappLink } from "../../hooks/usePublicData";

interface WhatsAppButtonProps {
  requestNumber?: string;
  serviceName?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
  /** floating = fixed bottom-right bubble (default when used without props) */
  variant?: "floating" | "button" | "link";
}

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  requestNumber,
  serviceName,
  className = "",
  size = "md",
  label,
  variant,
}) => {
  const { data: settings } = useSettings();
  const mode = variant ?? (requestNumber || serviceName || label ? "button" : "floating");

  let text = "Hello Research Hub, I would like to know more about your services.";
  if (requestNumber && serviceName) {
    text = (
      settings?.whatsappDefaultMessageTemplate ||
      "Hello Research Hub, I am writing about request #{requestNumber} ({serviceName})."
    )
      .replace(/#?\{requestNumber\}/g, `#${requestNumber}`)
      .replace(/\{serviceName\}/g, serviceName);
  } else if (serviceName) {
    text = `Hello Research Hub, I would like to discuss "${serviceName}".`;
  } else if (requestNumber) {
    text = `Hello Research Hub, I am writing about request #${requestNumber}.`;
  }

  const href = whatsappLink(settings?.whatsappNumber, text);
  if (!href) return null;

  if (mode === "floating") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="fixed bottom-5 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-[#1FAF5A] text-white shadow-lift transition-transform hover:scale-105 sm:bottom-6 sm:right-6"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
    );
  }

  if (mode === "link") {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={`link inline-flex items-center gap-1.5 ${className}`}>
        <MessageCircle className="h-4 w-4" />
        {label || "Chat on WhatsApp"}
      </a>
    );
  }

  const sizeCls = size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "";
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`btn-secondary ${sizeCls} ${className}`}>
      <MessageCircle className="h-4 w-4 text-[#1FAF5A]" />
      {label || "Chat on WhatsApp"}
    </a>
  );
};
