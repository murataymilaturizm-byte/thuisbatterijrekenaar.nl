/**
 * Frontmatter-schema van een inhoudspagina (src/content/pages/*.mdx).
 *
 * Eén plek waar staat welke velden een pagina kent en welke verplicht zijn.
 * MDX-frontmatter wordt door Astro niet uit zichzelf getypeerd; wie het
 * object aanraakt (de conceptenpagina, de kennisbank, scripts) typeert het
 * hiermee zodat een hernoemd of vergeten veld opvalt.
 */
export interface PaginaFrontmatter {
  /** SEO-titel, inclusief het achtervoegsel "| Thuisbatterijrekenaar" */
  title: string;
  /** Meta description */
  description: string;
  /** Zichtbare H1 */
  h1: string;
  /**
   * De zoekintentie die deze pagina bedient: welke vraag stelt iemand die
   * hier hoort te landen? Optioneel en mag leeg zijn; wordt redactioneel
   * ingevuld. Dient om cannibalisatie te herkennen — twee pagina's met
   * dezelfde intentie concurreren met elkaar.
   */
  zoekintentie?: string;
  /** Publicatiedatum (YYYY-MM-DD) */
  gepubliceerd: string;
  /** Cluster uit config/clusters.ts; stuurt kennisbank en kruimelpad */
  cluster?: string;
  /** Datum van de laatste inhoudelijke controle; vult dateModified */
  gecontroleerd?: string;
  /** Twee à drie zinnen die de vraag van de pagina direct beantwoorden */
  kortAntwoord?: string;
  /** Fiscale/juridische/verzekeringsonderwerpen krijgen een disclaimer */
  ymyl?: boolean;
  /** FAQ: één bron voor het zichtbare blok én het FAQPage-schema */
  faq?: { vraag: string; antwoord: string }[];

  // Alleen op concepten:
  /** false = concept; komt niet in de build, sitemap of kennisbank */
  published?: boolean;
  /** Datum waarop de generator het concept schreef */
  gegenereerd?: string;
  /** true = met AI opgesteld, vóór publicatie menselijk geredigeerd */
  aiGegenereerd?: boolean;
}
