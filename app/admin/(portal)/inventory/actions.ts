'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export type DbInventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock'
export type DbUsageAction     = 'used' | 'restocked'

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

async function nextCode(admin: ReturnType<typeof createAdminClient>) {
  const { data } = await admin
    .from('inventory_items')
    .select('code')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const last = (data as any)?.code ? parseInt((data as any).code.replace(/\D/g, '')) : 0
  return `SKU-${String((isNaN(last) ? 0 : last) + 1).padStart(4, '0')}`
}

// ─── Queries ──────────────────────────────────────────────────────────────────
export async function getInventoryItems(): Promise<InventoryItemRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('inventory_items')
    .select(`*, project:project_id(name)`)
    .order('created_at', { ascending: false })

  if (error) { console.error('getInventoryItems:', error); return [] }

  return (data ?? []).map((row: any) => ({
    id:              row.id,
    code:            row.code,
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

  if (error) { console.error('getUsageLog:', error); return [] }

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
  const code  = await nextCode(admin)

  const { data, error } = await admin
    .from('inventory_items')
    .insert({ ...input, code })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/admin/inventory')
  return { id: data.id, code }
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
