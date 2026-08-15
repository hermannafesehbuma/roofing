/**
 * Vertical rhythm shared by every portal list screen.
 *
 * The bands above the data — stat cards, tabs, then the toolbar that carries
 * the Kanban/List switch — sit 48px apart. The toolbar itself closes tighter,
 * 24px, so the view switch reads as attached to the cards or table it governs
 * rather than floating between the two.
 *
 *   stat cards
 *      ↕ BAND_GAP (48)
 *   tabs
 *      ↕ BAND_GAP (48)
 *   toolbar — Kanban / List, search, filter, primary action
 *      ↕ CONTENT_GAP (24)
 *   cards or table
 */
export const BAND_GAP    = 'mb-12'
export const CONTENT_GAP = 'mb-6'
