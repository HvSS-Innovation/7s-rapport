/* upk-data.js — UPK-punkter för korridor-/kartverktyget.
 *
 * AVSIKTLIGT TOM i det publika repot.
 * ----------------------------------------------------------------------------
 * Detta verktyg är ett OPSEC-medvetet skal: INGEN skarp koordinatdata får
 * checkas in i det publika repot (github.com → GitHub Pages = världsläsbart,
 * git-historik + forks är oåterkalleligt). Operatören importerar sin egen
 * punktfil lokalt via Data-fliken → den lagras bara i webbläsarens
 * localStorage (nyckel hv_upk_data) och rensas av "Glöm enheten" (opsec.html).
 *
 * Format på en importfil: en JSON-array av objekt (fältnamn, inga skarpa värden):
 *   { "upk":"<etikett>", "mgrs":"<mgrs>",
 *     "lat":<grader>, "lon":<grader>, "utm_e":<meter>, "utm_n":<meter> }
 * (utm_e/utm_n i meter, UTM-zon 33N / WGS84 — krävs för korridorberäkningen.)
 */
window.UPK_DATA = [];
