import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, Branch } from '@/lib/api';

interface BranchContextType {
  branches: Branch[];
  selectedBranch: Branch | null;
  setSelectedBranch: (branch: Branch) => void;
  refreshBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  const refreshBranches = async () => {
    try {
      const data = await api.getBranches();
      setBranches(data);
      
      // If no branch is selected, or the selected branch is no longer in the list, select the first one
      if (data.length > 0) {
        const currentSelectedId = localStorage.getItem('selectedBranchId');
        let branchToSelect = data.find(b => b.id === Number(currentSelectedId));
        
        if (!branchToSelect) {
          // Default to main branch (id 1) or first available
          branchToSelect = data.find(b => b.id === 1) || data[0];
        }
        
        if (branchToSelect) {
          setSelectedBranch(branchToSelect);
          localStorage.setItem('selectedBranchId', branchToSelect.id.toString());
        }
      } else {
        setSelectedBranch(null);
        localStorage.removeItem('selectedBranchId');
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    }
  };

  useEffect(() => {
    refreshBranches();
  }, []);

  const handleSetSelectedBranch = (branch: Branch) => {
    setSelectedBranch(branch);
    localStorage.setItem('selectedBranchId', branch.id.toString());
  };

  return (
    <BranchContext.Provider value={{ branches, selectedBranch, setSelectedBranch: handleSetSelectedBranch, refreshBranches }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
}
