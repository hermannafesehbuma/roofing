import { getInvoices, getRecurringPlans, getPayments, getInvoiceFormOptions } from './actions'
import { InvoicesClient } from './InvoicesClient'

export default async function InvoicesPage() {
  const [invoices, recurring, payments, formOptions] = await Promise.all([
    getInvoices(),
    getRecurringPlans(),
    getPayments(),
    getInvoiceFormOptions(),
  ])

  return (
    <InvoicesClient
      initialInvoices={invoices}
      initialRecurring={recurring}
      initialPayments={payments}
      clients={formOptions.clients}
      projects={formOptions.projects}
    />
  )
}
