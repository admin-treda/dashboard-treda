import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from '@/lib/api'

interface BusinessUnit {
  id: string
  name: string
  description: string
  industry?: string
  status: string
}

interface BusinessUnitContextType {
  units: BusinessUnit[]
  selectedBU: string | null
  selectedUnit: BusinessUnit | null
  loading: boolean
  setSelectedBU: (id: string | null) => void
  refreshUnits: () => Promise<void>
}

const BusinessUnitContext = createContext<BusinessUnitContextType | undefined>(undefined)

export function BusinessUnitProvider({ children }: { children: ReactNode }) {
  const [units, setUnits] = useState<BusinessUnit[]>([])
  const [selectedBU, setSelectedBU] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUnits = async () => {
    try {
      const res = await api.get('/business-units')
      setUnits(res.data.units || [])
    } catch (error) {
      console.error('Error loading business units:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshUnits()
  }, [])

  const selectedUnit = units.find(u => u.id === selectedBU) || null

  return (
    <BusinessUnitContext.Provider value={{
      units,
      selectedBU,
      selectedUnit,
      loading,
      setSelectedBU,
      refreshUnits
    }}>
      {children}
    </BusinessUnitContext.Provider>
  )
}

export function useBusinessUnit() {
  const context = useContext(BusinessUnitContext)
  if (!context) {
    throw new Error('useBusinessUnit must be used within BusinessUnitProvider')
  }
  return context
}
