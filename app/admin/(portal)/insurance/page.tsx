import { getPolicies, getCertifications, getEmployeeOptions } from './actions'
import { InsuranceClient } from './InsuranceClient'

export default async function InsurancePage() {
  const [policies, certs, employees] = await Promise.all([
    getPolicies(),
    getCertifications(),
    getEmployeeOptions(),
  ])

  return (
    <InsuranceClient
      initialPolicies={policies}
      initialCerts={certs}
      employees={employees}
    />
  )
}
