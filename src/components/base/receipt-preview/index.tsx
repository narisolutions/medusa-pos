import React from "react";
import { PAPER_CONFIG, type PaperWidth } from "@narisolutions/pos-toolkit/receipt-builder";
import { cn } from "@/lib/utils";

interface Props {
  /** The exact text the printer is sent — shown unaltered, so what is seen is what prints. */
  text: string;
  paperWidth: PaperWidth;
  /** The store logo the print job puts above the text; without one it prints `companyName`. */
  logoSrc?: string | null;
  companyName: string;
  className?: string;
}

// Torn-paper edge: the cue that this is paper, not another panel.
const SERRATION: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg, transparent 50%, #ffffff 50%), linear-gradient(-45deg, transparent 50%, #ffffff 50%)",
  backgroundSize: "10px 10px",
  backgroundRepeat: "repeat-x",
};

/**
 * A receipt on a strip of thermal paper. White and black whatever the theme, because that
 * is the paper; exactly the printer's character width, so a line that overruns shows.
 */
const ReceiptPreview: React.FC<Props> = ({ text, paperWidth, logoSrc, companyName, className }) => {
  // `ch` follows each strip's own font, so every strip carries the same mono face and size.
  const strip: React.CSSProperties = { width: `calc(${PAPER_CONFIG[paperWidth].lineWidth}ch + 1.5rem)` };
  // The logo raster is 384 dots: two thirds of an 80mm head, all of a 57mm one.
  const logoWidth = paperWidth === "57mm" ? "100%" : "67%";

  return (
    <div className={cn("flex justify-center overflow-x-auto rounded-lg bg-surface-subtle p-4", className)}>
      <div className="shrink-0 drop-shadow-md">
        <div className="h-[10px]" style={{ ...SERRATION, transform: "scaleY(-1)" }} />
        <div className="flex justify-center bg-white px-3 pt-3 font-mono text-[13px] text-[#111]" style={strip}>
          {logoSrc ? (
            <img src={logoSrc} alt="" className="max-h-32 object-contain grayscale contrast-150" style={{ maxWidth: logoWidth }} />
          ) : (
            <span className="font-bold">{companyName}</span>
          )}
        </div>
        <pre
          className="whitespace-pre bg-white px-3 pt-3 pb-1 font-mono text-[13px] leading-[1.45] text-[#111] tabular-nums"
          style={strip}
        >
          {text}
        </pre>
        <div className="h-[10px]" style={SERRATION} />
      </div>
    </div>
  );
};

export default ReceiptPreview;
