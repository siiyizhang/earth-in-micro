const FONTS = { sans: "'Inter', sans-serif" };

interface Props {
  href: string;
}

export default function StripeButton({ href }: Props) {
  return (
    <a
      href={href || "#"}
      target={href ? "_blank" : undefined}
      rel="noopener noreferrer"
      style={{
        display: "inline-block",
        fontFamily: FONTS.sans, fontSize: 13, fontWeight: 600,
        letterSpacing: "0.06em", color: "#ffffff",
        background: "#0ABFBC",
        border: "none", borderRadius: 40, padding: "12px 28px",
        cursor: "pointer", textDecoration: "none",
        transition: "background 0.2s, transform 0.15s",
        boxShadow: "0 8px 26px rgba(10,191,188,0.22)",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLAnchorElement).style.background = "#0dd4d1";
        (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.03)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLAnchorElement).style.background = "#0ABFBC";
        (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)";
      }}
    >
      Pre-order →
    </a>
  );
}
