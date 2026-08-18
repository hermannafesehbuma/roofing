/**
 * Vertical rhythm shared by every portal list screen.
 *
 * The stat band sits 48px above the tabs — it is a summary, separate from the
 * controls that govern the data. Everything below that closes to 34px: the tabs
 * and the toolbar read as one block attached to the cards or table they filter,
 * rather than three bands floating apart.
 *
 *   stat cards
 *      ↕ BAND_GAP (48)
 *   tabs
 *      ↕ CONTENT_GAP (34)
 *   toolbar — Kanban/List switch, search, filter, primary action
 *      ↕ CONTENT_GAP (34)
 *   cards or table
 */
export const BAND_GAP    = 'mb-12'
export const CONTENT_GAP = 'mb-[34px]'
