import { AFFILIATE_REL, partnerLink } from '../../config/partners';

interface Props {
  partnerId: string;
  /** Sub ID (ws): vertelt ons welke plaatsing de overstap opleverde. */
  subId: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Reactvariant van AffiliateLink (voor het rekenaar-island). Zelfde bron,
 * zelfde verplichte attributen; rendert niets als de partner inactief is.
 */
export default function AffiliateLink({ partnerId, subId, children, className }: Props) {
  const href = partnerLink(partnerId, subId);
  if (!href) return null;
  return (
    <a
      href={href}
      rel={AFFILIATE_REL}
      target="_blank"
      className={className}
      data-affiliate={partnerId}
    >
      {children}
    </a>
  );
}
