/** Logo BidMaster — dokumen + huruf B + percikan amber (dari Logo-BidMaster-html). */
export function LogoMark({ size = 32, inverted = false }: { size?: number; inverted?: boolean }) {
  const bg = inverted ? "#FFFFFF" : "#0F1B3D";
  const doc = inverted ? "#0F1B3D" : "#FFFFFF";
  const fold = inverted ? "#3B4A80" : "#C9D1F0";
  const ink = inverted ? "#FFFFFF" : "#0F1B3D";
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label="Logo BidMaster" aria-hidden={false}>
      <rect width="64" height="64" rx="15" fill={bg} />
      <path d="M17 11H36L47 22V50A3 3 0 0 1 44 53H17A3 3 0 0 1 14 50V14A3 3 0 0 1 17 11Z" fill={doc} />
      <path d="M36 11V19A3 3 0 0 0 39 22H47Z" fill={fold} />
      <path d="M21 22V43M21 22H27.5A5 5 0 0 1 27.5 32H21M21 32H29A5.5 5.5 0 0 1 29 43H21" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M47 35C47.7 40.5 50.5 43.3 56 44C50.5 44.7 47.7 47.5 47 53C46.3 47.5 43.5 44.7 38 44C43.5 43.3 46.3 40.5 47 35Z" fill="#FFB020" stroke={ink} strokeWidth="4" strokeLinejoin="round" paintOrder="stroke" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`tracking-tight whitespace-nowrap ${className}`} aria-label="BidMaster">
      <span className="font-light">Bid</span>
      <span className="font-extrabold">Master</span>
    </span>
  );
}
