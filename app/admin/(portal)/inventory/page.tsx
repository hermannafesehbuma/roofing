import { getInventoryItems, getUsageLog, getInventoryFormOptions } from './actions'
import { InventoryClient } from './InventoryClient'

export default async function InventoryPage() {
  const [items, usage, formOptions] = await Promise.all([
    getInventoryItems(),
    getUsageLog(),
    getInventoryFormOptions(),
  ])

  return (
    <InventoryClient
      initialItems={items}
      initialUsage={usage}
      projects={formOptions.projects}
    />
  )
}
