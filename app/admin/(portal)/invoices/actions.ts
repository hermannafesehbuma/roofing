'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── Types ────────────────────────────────────────────────────────────────────
export type DbInvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'partial'
export type DbFrequency    = 'monthly' | 'quarterly' | 'annual'
export type DbPayMethod    = 'bank_transfer' | 'check' | 'card'
export type DbPayStatus    = 'cleared' | 'pending'

export type InvoiceItemRow = {
  id: string
  description: string
  qty: number
  rate: number
  sort_order: number
}

export type InvoiceRow = {
  id: string
  code: string
  client_id: string
  client_name: string
  client_company: string | null
  client_email: string
  project_id: string | null
  project_name: string | null
  issued_date: string
  due_date: string
  status: DbInvoiceStatus
  tax: number
  notes: string | null
  items: InvoiceItemRow[]
  created_at: string
}

export type RecurringRow = {
  id: string
  code: string
  client_id: string
  client_name: string
  client_company: string | null
  description: string
  amount: number
  frequency: DbFrequency
  next_date: string
  status: 'active' | 'stopped'
  created_at: string
}

export type PaymentRow = {
  id: string
  code: string
  invoice_id: string
  invoice_code: string
  client_name: string
  client_company: string | null
  date: string
  method: DbPayMethod
  amount: number
  reference: string
  status: DbPayStatus
  created_at: string
}

export type ClientOption  = { id: string; name: string; company: string | null; email: string }
export type ProjectOption = { id: string; name: string }

// ─── Code generators ──────────────────────────────────────────────────────────
async function nextCode(admin: ReturnType<typeof createAdminClient>, table: string, prefix: string) {
  const { data } = await admin
    .from(table)
    .select('code')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const last = (data as any)?.code ? parseInt((data as any).code.replace(/\D/g, '')) : 0
  return `${prefix}-${String((isNaN(last) ? 0 : last) + 1).padStart(4, '0')}`
}

// ─── Queries ──────────────────────────────────────────────────────────────────
export async function getInvoices(): Promise<InvoiceRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('invoices')
    .select(`
      *,
      client:client_id(name, company, email),
      project:project_id(name),
      items:invoice_items(id, description, qty, rate, sort_order)
    `)
    .order('created_at', { ascending: false })

  if (error) { console.error('getInvoices:', error); return [] }

  return (data ?? []).map((row: any) => ({
    id:              row.id,
    code:            row.code,
    client_id:       row.client_id,
    client_name:     row.client?.name ?? 'Unknown',
    client_company:  row.client?.company ?? null,
    client_email:    row.client?.email ?? '',
    project_id:      row.project_id,
    project_name:    row.project?.name ?? null,
    issued_date:     row.issued_date,
    due_date:        row.due_date,
    status:          row.status as DbInvoiceStatus,
    tax:             row.tax ?? 8,
    notes:           row.notes ?? null,
    items:           (row.items ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
    created_at:      row.created_at,
  }))
}

export async function getRecurringPlans(): Promise<RecurringRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('recurring_plans')
    .select(`*, client:client_id(name, company)`)
    .order('created_at', { ascending: false })

  if (error) { console.error('getRecurringPlans:', error); return [] }

  return (data ?? []).map((row: any) => ({
    id:             row.id,
    code:           row.code,
    client_id:      row.client_id,
    client_name:    row.client?.name ?? 'Unknown',
    client_company: row.client?.company ?? null,
    description:    row.description,
    amount:         row.amount,
    frequency:      row.frequency as DbFrequency,
    next_date:      row.next_date,
    status:         row.status,
    created_at:     row.created_at,
  }))
}

export async function getPayments(): Promise<PaymentRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('payment_records')
    .select(`
      *,
      invoice:invoice_id(code, client:client_id(name, company))
    `)
    .order('date', { ascending: false })

  if (error) { console.error('getPayments:', error); return [] }

  return (data ?? []).map((row: any) => ({
    id:             row.id,
    code:           row.code,
    invoice_id:     row.invoice_id,
    invoice_code:   row.invoice?.code ?? '',
    client_name:    row.invoice?.client?.name ?? 'Unknown',
    client_company: row.invoice?.client?.company ?? null,
    date:           row.date,
    method:         row.method as DbPayMethod,
    amount:         row.amount,
    reference:      row.reference,
    status:         row.status as DbPayStatus,
    created_at:     row.created_at,
  }))
}

export async function getInvoiceFormOptions(): Promise<{ clients: ClientOption[]; projects: ProjectOption[] }> {
  const admin = createAdminClient()
  const [cRes, pRes] = await Promise.all([
    admin.from('clients').select('id, name, company, email').order('name'),
    admin.from('projects').select('id, name').order('name'),
  ])
  return {
    clients:  (cRes.data ?? []) as ClientOption[],
    projects: (pRes.data ?? []) as ProjectOption[],
  }
}

// ─── Invoice mutations ─────────────────────────────────────────────────────────
export type InvoiceItemInput = { description: string; qty: number; rate: number }

export type CreateInvoiceInput = {
  client_id:  string
  project_id: string | null
  issued_date: string
  due_date:   string
  status:     DbInvoiceStatus
  tax:        number
  notes:      string | null
  items:      InvoiceItemInput[]
}

export async function createInvoice(input: CreateInvoiceInput) {
  const admin = createAdminClient()
  const code  = await nextCode(admin, 'invoices', 'INV')

  const { data, error } = await admin
    .from('invoices')
    .insert({
      code,
      client_id:  input.client_id,
      project_id: input.project_id,
      issued_date: input.issued_date,
      due_date:   input.due_date,
      status:     input.status,
      tax:        input.tax,
      notes:      input.notes,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  if (input.items.length > 0) {
    const { error: iErr } = await admin.from('invoice_items').insert(
      input.items.map((item, i) => ({
        invoice_id:  data.id,
        description: item.description,
        qty:         item.qty,
        rate:        item.rate,
        sort_order:  i,
      }))
    )
    if (iErr) return { error: iErr.message }
  }

  revalidatePath('/admin/invoices')
  return { id: data.id, code }
}

export async function updateInvoice(id: string, input: CreateInvoiceInput) {
  const admin = createAdminClient()

  const { error } = await admin.from('invoices').update({
    client_id:  input.client_id,
    project_id: input.project_id,
    issued_date: input.issued_date,
    due_date:   input.due_date,
    status:     input.status,
    tax:        input.tax,
    notes:      input.notes,
  }).eq('id', id)

  if (error) return { error: error.message }

  await admin.from('invoice_items').delete().eq('invoice_id', id)
  if (input.items.length > 0) {
    const { error: iErr } = await admin.from('invoice_items').insert(
      input.items.map((item, i) => ({
        invoice_id:  id,
        description: item.description,
        qty:         item.qty,
        rate:        item.rate,
        sort_order:  i,
      }))
    )
    if (iErr) return { error: iErr.message }
  }

  revalidatePath('/admin/invoices')
  return { success: true }
}

export async function deleteInvoice(id: string) {
  const admin = createAdminClient()
  const { error } = await admin.from('invoices').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/invoices')
  return { success: true }
}

export async function markInvoicePaid(invoiceId: string, method: DbPayMethod, amount: number) {
  const admin = createAdminClient()

  const { error: invErr } = await admin.from('invoices').update({ status: 'paid' }).eq('id', invoiceId)
  if (invErr) return { error: invErr.message }

  const code = await nextCode(admin, 'payment_records', 'PAY')
  const ref  = `TXN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

  const { data, error: payErr } = await admin.from('payment_records').insert({
    code,
    invoice_id: invoiceId,
    date:       new Date().toISOString().split('T')[0],
    method,
    amount,
    reference:  ref,
    status:     'cleared',
  }).select('id').single()

  if (payErr) return { error: payErr.message }

  revalidatePath('/admin/invoices')
  return { paymentId: data.id, code, reference: ref }
}

// ─── Recurring mutations ───────────────────────────────────────────────────────
export type CreateRecurringInput = {
  client_id:   string
  description: string
  amount:      number
  frequency:   DbFrequency
  next_date:   string
  status:      'active' | 'stopped'
}

export async function createRecurring(input: CreateRecurringInput) {
  const admin = createAdminClient()
  const code  = await nextCode(admin, 'recurring_plans', 'REC')

  const { data, error } = await admin
    .from('recurring_plans')
    .insert({ ...input, code })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/admin/invoices')
  return { id: data.id, code }
}

export async function updateRecurring(id: string, input: Partial<CreateRecurringInput>) {
  const admin = createAdminClient()
  const { error } = await admin.from('recurring_plans').update(input).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/invoices')
  return { success: true }
}
