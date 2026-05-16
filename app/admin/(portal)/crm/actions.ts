'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── Types ────────────────────────────────────────────────────────────────────
export type DbLeadStage = 'new_lead' | 'contacted' | 'proposal_sent' | 'lost' | 'won' | 'closed'
export type DbLeadSource = 'referral' | 'website' | 'cold_call' | 'mobile' | 'social'
export type DbPortalStatus = 'active' | 'invited' | 'inactive'

export type LeadRow = {
  id: string
  first_name: string
  last_name: string
  company: string | null
  email: string | null
  phone: string | null
  address: string | null
  stage: DbLeadStage
  source: DbLeadSource | null
  expected_value: number | null
  assigned_rep_id: string | null
  assigned_rep_name: string | null
  notes: string | null
  days_in_stage: number
  converted_client_id: string | null
  created_at: string
}

export type ClientRow = {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  address: string | null
  manager_id: string | null
  manager_name: string | null
  portal_status: DbPortalStatus
  created_at: string
}

export type RepOption = { id: string; name: string }

// ─── Queries ──────────────────────────────────────────────────────────────────
export async function getLeads(): Promise<LeadRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('leads')
    .select(`
      id, first_name, last_name, company, email, phone, address,
      stage, source, expected_value, assigned_rep_id, notes,
      days_in_stage, converted_client_id, created_at,
      rep:assigned_rep_id(first_name, last_name)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getLeads error:', error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    ...row,
    assigned_rep_name: row.rep
      ? `${row.rep.first_name} ${row.rep.last_name}`.trim()
      : null,
    rep: undefined,
  }))
}

export async function getClients(): Promise<ClientRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('clients')
    .select(`
      id, name, email, phone, company, address,
      manager_id, portal_status, created_at,
      manager:manager_id(first_name, last_name)
    `)
    .order('name')

  if (error) {
    console.error('getClients error:', error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    ...row,
    manager_name: row.manager
      ? `${row.manager.first_name} ${row.manager.last_name}`.trim()
      : null,
    manager: undefined,
  }))
}

export async function getRepOptions(): Promise<RepOption[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('users')
    .select('id, first_name, last_name')
    .in('role', ['admin', 'manager'])
    .order('first_name')

  return (data ?? []).map((u: any) => ({
    id: u.id,
    name: `${u.first_name} ${u.last_name}`.trim(),
  }))
}

// ─── Mutations ────────────────────────────────────────────────────────────────
export type CreateLeadInput = {
  firstName: string
  lastName: string
  company: string
  email: string
  phone: string
  address: string
  stage: DbLeadStage
  source: DbLeadSource | null
  expectedValue: number | null
  assignedRepId: string | null
  notes: string
}

export async function createLead(input: CreateLeadInput) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('leads')
    .insert({
      first_name: input.firstName,
      last_name: input.lastName,
      company: input.company || null,
      email: input.email || null,
      phone: input.phone || null,
      address: input.address || null,
      stage: input.stage,
      source: input.source,
      expected_value: input.expectedValue,
      assigned_rep_id: input.assignedRepId || null,
      notes: input.notes || null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/admin/crm')
  return { id: data.id }
}

export type UpdateLeadInput = Partial<CreateLeadInput> & { id: string; stage?: DbLeadStage }

export async function updateLead(input: UpdateLeadInput) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('leads')
    .update({
      ...(input.firstName !== undefined && { first_name: input.firstName }),
      ...(input.lastName !== undefined && { last_name: input.lastName }),
      ...(input.company !== undefined && { company: input.company || null }),
      ...(input.email !== undefined && { email: input.email || null }),
      ...(input.phone !== undefined && { phone: input.phone || null }),
      ...(input.address !== undefined && { address: input.address || null }),
      ...(input.stage !== undefined && { stage: input.stage }),
      ...(input.source !== undefined && { source: input.source }),
      ...(input.expectedValue !== undefined && { expected_value: input.expectedValue }),
      ...(input.assignedRepId !== undefined && { assigned_rep_id: input.assignedRepId || null }),
      ...(input.notes !== undefined && { notes: input.notes || null }),
    })
    .eq('id', input.id)

  if (error) return { error: error.message }
  revalidatePath('/admin/crm')
  return { success: true }
}

export async function deleteLead(id: string) {
  const admin = createAdminClient()
  const { error } = await admin.from('leads').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/crm')
  return { success: true }
}

export async function convertLeadToClient(leadId: string): Promise<{ clientId: string } | { error: string }> {
  const admin = createAdminClient()

  // Fetch the lead
  const { data: lead, error: leadErr } = await admin
    .from('leads')
    .select('id, first_name, last_name, email, phone, company, address, assigned_rep_id')
    .eq('id', leadId)
    .single()

  if (leadErr || !lead) return { error: leadErr?.message ?? 'Lead not found' }
  if (!lead.email) return { error: 'Lead must have an email to become a client' }

  // Check if already converted (email already in clients)
  const { data: existing } = await admin
    .from('clients')
    .select('id')
    .eq('email', lead.email)
    .maybeSingle()

  if (existing) {
    // Already a client — just link and mark won
    await admin.from('leads').update({
      stage: 'won',
      converted_client_id: existing.id,
    }).eq('id', leadId)
    revalidatePath('/admin/crm')
    return { clientId: existing.id }
  }

  // Create the client record
  const { data: client, error: clientErr } = await admin
    .from('clients')
    .insert({
      name: `${lead.first_name} ${lead.last_name}`.trim(),
      email: lead.email,
      phone: lead.phone ?? null,
      company: lead.company ?? null,
      address: lead.address ?? null,
      manager_id: lead.assigned_rep_id ?? null,
      portal_status: 'invited',
    })
    .select('id')
    .single()

  if (clientErr) return { error: clientErr.message }

  // Update lead: mark won and link to new client
  await admin.from('leads').update({
    stage: 'won',
    converted_client_id: client.id,
  }).eq('id', leadId)

  revalidatePath('/admin/crm')
  return { clientId: client.id }
}
