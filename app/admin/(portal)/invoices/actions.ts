'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/sendEmail'

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
  if (table !== 'invoices') return `${prefix}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
  const { data } = await admin
    .from(table)
    .select('invoice_number')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const lastStr = (data as any)?.invoice_number || ''
  const last = parseInt(lastStr.replace(/\D/g, ''))
  return `${prefix}-${String((isNaN(last) ? 0 : last) + 1).padStart(4, '0')}`
}

// ─── Queries ──────────────────────────────────────────────────────────────────
export async function getInvoices(): Promise<InvoiceRow[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let isClient = false
  if (user) {
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    isClient = profile?.role === 'client'
  }

  const admin = createAdminClient()
  let query = admin
    .from('invoices')
    .select(`
      *,
      client:client_id(name, company, email),
      project:project_id(name),
      items:invoice_items(id, description, quantity, unit_price)
    `)
    .order('created_at', { ascending: false })

  if (isClient && user) {
    query = query.eq('client_id', user.id)
  }

  const { data, error } = await query

  if (error) { console.error('getInvoices:', error); return [] }

  return (data ?? []).map((row: any) => ({
    id:              row.id,
    code:            row.invoice_number,
    client_id:       row.client_id,
    client_name:     row.client?.name ?? 'Unknown',
    client_company:  row.client?.company ?? null,
    client_email:    row.client?.email ?? '',
    project_id:      row.project_id,
    project_name:    row.project?.name ?? null,
    issued_date:     row.issued_date,
    due_date:        row.due_date,
    status:          row.status as DbInvoiceStatus,
    tax:             (row.tax_rate ?? 0) * 100, // DB stores as fraction
    notes:           row.notes ?? null,
    items:           (row.items ?? []).map((i: any) => ({
                       id: i.id,
                       description: i.description,
                       qty: i.quantity,
                       rate: i.unit_price,
                       sort_order: 0
                     })),
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
    code:           'REC-' + row.id.split('-')[0].toUpperCase(),
    client_id:      row.client_id,
    client_name:    row.client?.name ?? 'Unknown',
    client_company: row.client?.company ?? null,
    description:    row.description,
    amount:         row.amount,
    frequency:      row.frequency as DbFrequency,
    next_date:      row.next_date,
    status:         row.is_active ? 'active' : 'stopped',
    created_at:     row.created_at,
  }))
}

export async function getPayments(): Promise<PaymentRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('payments')
    .select(`
      *,
      invoice:invoice_id(invoice_number, client:client_id(name, company))
    `)
    .order('paid_at', { ascending: false })

  if (error) { console.error('getPayments:', error); return [] }

  return (data ?? []).map((row: any) => ({
    id:             row.id,
    code:           'PAY-' + row.id.split('-')[0].toUpperCase(),
    invoice_id:     row.invoice_id,
    invoice_code:   row.invoice?.invoice_number ?? '',
    client_name:    row.invoice?.client?.name ?? 'Unknown',
    client_company: row.invoice?.client?.company ?? null,
    date:           row.paid_at ? row.paid_at.split('T')[0] : '',
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

  const subtotal = input.items.reduce((sum, item) => sum + (item.qty * item.rate), 0)
  const tax_amount = subtotal * (input.tax / 100)
  const total = subtotal + tax_amount

  const { data, error } = await admin
    .from('invoices')
    .insert({
      invoice_number: code,
      client_id:  input.client_id,
      project_id: input.project_id,
      issued_date: input.issued_date,
      due_date:   input.due_date,
      status:     input.status,
      tax_rate:   input.tax / 100, // fraction
      tax_amount: tax_amount,
      subtotal:   subtotal,
      total:      total,
      notes:      input.notes,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  if (input.items.length > 0) {
    const { error: iErr } = await admin.from('invoice_items').insert(
      input.items.map((item) => ({
        invoice_id:  data.id,
        description: item.description,
        quantity:    item.qty,
        unit_price:  item.rate,
        amount:      item.qty * item.rate,
      }))
    )
    if (iErr) return { error: iErr.message }
  }

  if (input.status === 'sent') {
    const { data: clientUser } = await admin.from('users').select('email').eq('id', input.client_id).single()
    const clientEmail = clientUser?.email || 'unknown@example.com'

    await admin.from('notifications').insert({
      user_id: input.client_id,
      title: 'New Invoice',
      body: `You have a new invoice (${code}) ready for payment.`,
      type: 'invoice',
      entity_id: data.id
    })

    await sendEmail({
      to: clientEmail,
      subject: `New Invoice from Roofing - ${code}`,
      html: `<p>Hello,</p><p>You have a new invoice (<strong>${code}</strong>) for $${total.toFixed(2)}.</p><p>Please log in to your portal to view and pay this invoice.</p>`
    })
  }

  revalidatePath('/admin/invoices')
  return { id: data.id, code }
}

export async function updateInvoice(id: string, input: CreateInvoiceInput) {
  const admin = createAdminClient()

  // Fetch old invoice to check if we are transitioning to 'sent'
  const { data: oldInv } = await admin.from('invoices').select('status, invoice_number').eq('id', id).single()

  const subtotal = input.items.reduce((sum, item) => sum + (item.qty * item.rate), 0)
  const tax_amount = subtotal * (input.tax / 100)
  const total = subtotal + tax_amount

  const { error } = await admin.from('invoices').update({
    client_id:  input.client_id,
    project_id: input.project_id,
    issued_date: input.issued_date,
    due_date:   input.due_date,
    status:     input.status,
    tax_rate:   input.tax / 100,
    tax_amount: tax_amount,
    subtotal:   subtotal,
    total:      total,
    notes:      input.notes,
  }).eq('id', id)

  if (error) return { error: error.message }

  await admin.from('invoice_items').delete().eq('invoice_id', id)
  if (input.items.length > 0) {
    const { error: iErr } = await admin.from('invoice_items').insert(
      input.items.map((item) => ({
        invoice_id:  id,
        description: item.description,
        quantity:    item.qty,
        unit_price:  item.rate,
        amount:      item.qty * item.rate,
      }))
    )
    if (iErr) return { error: iErr.message }
  }

  if (oldInv?.status !== 'sent' && input.status === 'sent') {
    const code = oldInv?.invoice_number || 'INV-XXX'
    const { data: clientUser } = await admin.from('users').select('email').eq('id', input.client_id).single()
    const clientEmail = clientUser?.email || 'unknown@example.com'

    await admin.from('notifications').insert({
      user_id: input.client_id,
      title: 'New Invoice',
      body: `You have a new invoice (${code}) ready for payment.`,
      type: 'invoice',
      entity_id: id
    })

    await sendEmail({
      to: clientEmail,
      subject: `New Invoice from Roofing - ${code}`,
      html: `<p>Hello,</p><p>You have a new invoice (<strong>${code}</strong>) for $${total.toFixed(2)}.</p><p>Please log in to your portal to view and pay this invoice.</p>`
    })
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

  const { error: invErr } = await admin.from('invoices').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', invoiceId)
  if (invErr) return { error: invErr.message }

  const ref  = `TXN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

  const { data, error: payErr } = await admin.from('payments').insert({
    invoice_id: invoiceId,
    method,
    amount,
    reference:  ref,
    status:     'cleared',
    paid_at:    new Date().toISOString()
  }).select('id').single()

  if (payErr) return { error: payErr.message }

  const code = 'PAY-' + data.id.split('-')[0].toUpperCase()

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

  const { data, error } = await admin
    .from('recurring_plans')
    .insert({ 
      client_id: input.client_id,
      description: input.description,
      amount: input.amount,
      frequency: input.frequency,
      next_date: input.next_date,
      is_active: input.status === 'active'
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  
  const code = 'REC-' + data.id.split('-')[0].toUpperCase()
  revalidatePath('/admin/invoices')
  return { id: data.id, code }
}

export async function updateRecurring(id: string, input: Partial<CreateRecurringInput>) {
  const admin = createAdminClient()
  
  const updatePayload: any = {}
  if (input.client_id) updatePayload.client_id = input.client_id
  if (input.description) updatePayload.description = input.description
  if (input.amount !== undefined) updatePayload.amount = input.amount
  if (input.frequency) updatePayload.frequency = input.frequency
  if (input.next_date) updatePayload.next_date = input.next_date
  if (input.status) updatePayload.is_active = input.status === 'active'

  const { error } = await admin.from('recurring_plans').update(updatePayload).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/invoices')
  return { success: true }
}
