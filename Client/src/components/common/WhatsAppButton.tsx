import React from "react";
import { MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "../../api";

interface WhatsAppButtonProps {
  requestNumber?: string;
  serviceName?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
  variant?: "floating" | "button" | "link";
}

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  requestNumber,
  serviceName,
  className = "",
  size = "md",
  label,
  variant = "button",
}) => {
  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: getPublicSettings,
    staleTime: 1000 * 30,
  });

  const whatsappNum = settings?.whatsappNumber || "918004153053";

  let text = "Hello Research Hub, I have an inquiry regarding academic research services.";
  if (requestNumber && serviceName) {
    text = (settings?.whatsappDefaultMessageTemplate || "Hello Research Hub, I am inquiring about Service Request #{requestNumber} ({serviceName}). Please provide updates and quotations.")
      .replace(/#?\{requestNumber\}/g, requestNumber)
      .replace(/\{serviceName\}/g, serviceName);
  } else if (serviceName) {
    text = `Hello Research Hub, I would like to inquire about "${serviceName}". Please share details and pricing scope.`;
  } else if (requestNumber) {
    text = `Hello Research Hub, I am inquiring about Service Request #${requestNumber}.`;
  }

  const cleanNum = whatsappNum.replace(/[^0-9]/g, "");
  const whatsappUrl = `https://wa.me/${cleanNum}?text=${encodeURIComponent(text)}`;

  if (variant === "floating") {
    return (
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Direct WhatsApp Consultation"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-full shadow-2xl shadow-emerald-950/60 transition-all duration-300 hover:scale-105 group border border-emerald-400/30 backdrop-blur-sm"
      >
        <div className="relative">
          <MessageSquare className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-200"></span>
          </span>
        </div>
        <span className="text-sm font-semibold tracking-wide">WhatsApp Support</span>
      </a>
    );
  }

  const sizeClasses = {
    sm: "px-2.5 py-1.5 text-[10px] sm:text-xs gap-1.5",
    md: "px-4 py-2.5 text-sm gap-2",
    lg: "px-6 py-3.5 text-base gap-2.5",
  };

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 hover:shadow-emerald-900/50 border border-emerald-400/20 active:scale-[0.98] max-w-full ${sizeClasses[size]} ${className}`}
    >
      <MessageSquare className={size === "sm" ? "w-3.5 h-3.5 shrink-0" : "w-4 h-4 shrink-0"} />
      <span className="truncate whitespace-nowrap">{label || "Discuss on WhatsApp"}</span>
    </a>
  );
};
