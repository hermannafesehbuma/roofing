import { getInventoryItems, getUsageLog, getPurchaseOrders, getInventoryFormOptions } from './actions'
import { InventoryClient } from './InventoryClient'

export default async function InventoryPage() {
  const [items, usage, purchaseOrders, formOptions] = await Promise.all([
    getInventoryItems(),
    getUsageLog(),
    getPurchaseOrders(),
    getInventoryFormOptions(),
  ])

  return (
    <InventoryClient
      initialItems={items}
      initialUsage={usage}
      initialPurchaseOrders={purchaseOrders}
      projects={formOptions.projects}
    />
  )
}
