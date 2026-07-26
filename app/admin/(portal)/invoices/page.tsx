import { getInvoices, getRecurringPlans, getPayments, getInvoiceFormOptions } from './actions'
import { InvoicesClient } from './InvoicesClient'

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ invoice?: string }>
}) {
  const [invoices, recurring, payments, formOptions, params] = await Promise.all([
    getInvoices(),
    getRecurringPlans(),
    getPayments(),
    getInvoiceFormOptions(),
    searchParams,
  ])

  return (
    <InvoicesClient
      // Remounts per deep link so a second one still opens its invoice.
      key={params.invoice ?? 'all'}
      initialInvoices={invoices}
      initialRecurring={recurring}
      initialPayments={payments}
      clients={formOptions.clients}
      projects={formOptions.projects}
      // Lets a project's Invoices tab link straight to one invoice's details.
      openInvoiceId={params.invoice ?? null}
    />
  )
}
