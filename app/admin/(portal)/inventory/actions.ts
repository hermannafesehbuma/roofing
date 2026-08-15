'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export type DbInventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock'
export type DbUsageAction     = 'used' | 'restocked'
export type DbPoStatus        = 'draft' | 'sent' | 'received'

export type InventoryItemRow = {
  id:              string
  code:            string
  name:            string
  sku:             string
  category:        string
  unit_of_measure: string
  qty_on_hand:     number
  min_threshold:   number
  unit_cost:       number
  supplier:        string
  project_id:      string | null
  project_name:    string | null
  note:            string | null
  created_at:      string
}

export type UsageLogRow = {
  id:           string
  item_id:      string
  item_name:    string
  item_sku:     string
  action:       DbUsageAction
  qty_change:   number
  project_id:   string | null
  project_name: string | null
  user_id:      string | null
  user_name:    string | null
  created_at:   string
}

export type PurchaseOrderRow = {
  id:                string
  inventory_item_id: string
  item_name:         string
  item_sku:          string
  quantity:          number
  supplier:          string | null
  unit_cost:         number
  total_cost:        number
  status:            DbPoStatus
  ordered_at:        string | null
  received_at:       string | null
  created_at:        string
}

/**
 * Supabase errors are plain objects whose fields do not survive `console.error`
 * interpolation — logging one directly prints `{}` and hides the cause. Spell
 * the fields out so a missing table or column names itself in the server log.
 */
function logQueryError(where: string, error: { message?: string; code?: string; details?: string; hint?: string }) {
  console.error(
    `${where}: ${error.message ?? 'unknown error'}` +
    (error.code    ? ` [${error.code}]` : '') +
    (error.details ? ` — ${error.details}` : '') +
    (error.hint    ? ` (hint: ${error.hint})` : '')
  )
}

// ─── Queries ──────────────────────────────────────────────────────────────────
export async function getInventoryItems(): Promise<InventoryItemRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('inventory_items')
    .select(`*, project:project_id(name)`)
    .order('created_at', { ascending: false })

  if (error) { logQueryError('getInventoryItems', error); return [] }

  return (data ?? []).map((row: any) => ({
    id:              row.id,
    code:            row.sku, // map code to sku since DB does not have code
    name:            row.name,
    sku:             row.sku,
    category:        row.category,
    unit_of_measure: row.unit_of_measure,
    qty_on_hand:     row.qty_on_hand,
    min_threshold:   row.min_threshold,
    unit_cost:       row.unit_cost,
    supplier:        row.supplier,
    project_id:      row.project_id,
    project_name:    row.project?.name ?? null,
    note:            row.note ?? null,
    created_at:      row.created_at,
  }))
}

export async function getUsageLog(): Promise<UsageLogRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('inventory_usage_log')
    .select(`
      *,
      item:item_id(name, sku),
      project:project_id(name),
      user:user_id(first_name, last_name)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) { logQueryError('getUsageLog', error); return [] }

  return (data ?? []).map((row: any) => ({
    id:           row.id,
    item_id:      row.item_id,
    item_name:    row.item?.name ?? 'Unknown',
    item_sku:     row.item?.sku ?? '',
    action:       row.action as DbUsageAction,
    qty_change:   row.qty_change,
    project_id:   row.project_id,
    project_name: row.project?.name ?? null,
    user_id:      row.user_id,
    user_name:    row.user ? `${row.user.first_name} ${row.user.last_name}` : null,
    created_at:   row.created_at,
  }))
}

export async function getPurchaseOrders(): Promise<PurchaseOrderRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('purchase_orders')
    .select(`*, item:inventory_item_id(name, sku)`)
    .order('created_at', { ascending: false })

  if (error) { logQueryError('getPurchaseOrders', error); return [] }

  return (data ?? []).map((row: any) => ({
    id:                row.id,
    inventory_item_id: row.inventory_item_id,
    item_name:         row.item?.name ?? 'Unknown',
    item_sku:          row.item?.sku ?? '',
    quantity:          Number(row.quantity),
    supplier:          row.supplier ?? null,
    unit_cost:         Number(row.unit_cost),
    total_cost:        Number(row.total_cost),
    status:            row.status as DbPoStatus,
    ordered_at:        row.ordered_at ?? null,
    received_at:       row.received_at ?? null,
    created_at:        row.created_at,
  }))
}

export async function getInventoryFormOptions() {
  const admin = createAdminClient()
  const projRes = await admin.from('projects').select('id, name').order('name')
  return { projects: (projRes.data ?? []) as { id: string; name: string }[] }
}

// ─── Mutations ─────────────────────────────────────────────────────────────────
export type CreateInventoryInput = {
  name:            string
  sku:             string
  category:        string
  unit_of_measure: string
  qty_on_hand:     number
  min_threshold:   number
  unit_cost:       number
  supplier:        string
  project_id:      string | null
  note:            string | null
}

export async function createInventoryItem(input: CreateInventoryInput) {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('inventory_items')
    .insert({ ...input })
    .select('id, sku')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/admin/inventory')
  return { id: data.id, code: data.sku }
}

export async function updateInventoryItem(id: string, input: Partial<CreateInventoryInput>) {
  const admin = createAdminClient()
  const { error } = await admin.from('inventory_items').update(input).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/inventory')
  return { success: true }
}

export async function deleteInventoryItem(id: string) {
  const admin = createAdminClient()
  const { error } = await admin.from('inventory_items').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/inventory')
  return { success: true }
}

export type CreatePurchaseOrderInput = {
  inventory_item_id: string
  quantity:          number
  supplier:          string | null
  unit_cost:         number
  status:            DbPoStatus
}

export async function createPurchaseOrder(input: CreatePurchaseOrderInput) {
  const admin = createAdminClient()
  const total_cost = input.quantity * input.unit_cost

  const { data, error } = await admin
    .from('purchase_orders')
    .insert({
      ...input,
      total_cost,
      // A draft has not gone to the supplier yet, so it carries no order date.
      ordered_at: input.status === 'draft' ? null : new Date().toISOString(),
    })
    .select('id, created_at, ordered_at')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/admin/inventory')
  return { id: data.id, created_at: data.created_at, ordered_at: data.ordered_at, total_cost }
}

/**
 * Moves a PO along draft → sent → received, stamping the matching timestamp.
 * Stock is NOT adjusted here — receiving goods is recorded through Log Usage so
 * every quantity change keeps a usage-log entry behind it.
 */
export async function updatePurchaseOrderStatus(id: string, status: DbPoStatus) {
  const admin = createAdminClient()
  const now = new Date().toISOString()

  const patch: Record<string, unknown> = { status }
  if (status === 'sent')     patch.ordered_at  = now
  if (status === 'received') patch.received_at = now

  const { error } = await admin.from('purchase_orders').update(patch).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/inventory')
  return { success: true, at: now }
}

export type LogUsageInput = {
  item_id:    string
  action:     DbUsageAction
  qty_change: number   // positive for restock, negative for used
  project_id: string | null
  user_id:    string | null
}

export async function logUsage(input: LogUsageInput) {
  const admin = createAdminClient()

  const { error: logErr } = await admin.from('inventory_usage_log').insert(input)
  if (logErr) return { error: logErr.message }

  const { data: item, error: fetchErr } = await admin
    .from('inventory_items')
    .select('qty_on_hand')
    .eq('id', input.item_id)
    .single()

  if (fetchErr || !item) return { error: 'Item not found' }

  const newQty = Math.max(0, (item as any).qty_on_hand + input.qty_change)
  const { error: updErr } = await admin
    .from('inventory_items')
    .update({ qty_on_hand: newQty })
    .eq('id', input.item_id)

  if (updErr) return { error: updErr.message }

  revalidatePath('/admin/inventory')
  return { success: true, newQty }
}
