import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { AutoComplete, Input } from 'antd';

interface SearchResult {
  value: string;
  label: React.ReactNode;
  customer: any;
}

interface Props {
  onSelect: (customer: any) => void;
}

const GlobalSearchBar: React.FC<Props> = ({ onSelect }) => {
  const [options, setOptions] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (value: string) => {
    if (!value || value.length < 2) {
      setOptions([]);
      return;
    }

    setLoading(true);
    try {
      // Fetch all customers to filter (could be optimized with a dedicated search API endpoint)
      const res = await fetch('/api/customers?id=admin&role=admin');
      const data = await res.json();
      
      const filtered = data
        .filter((c: any) => 
          c.username?.toLowerCase().includes(value.toLowerCase()) ||
          c.fullName?.toLowerCase().includes(value.toLowerCase()) ||
          c.cnic?.includes(value) ||
          c.id?.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 5)
        .map((c: any) => ({
          value: c.id,
          label: (
            <div className="flex justify-between items-center py-1">
              <span>{c.fullName || c.username}</span>
              <span className="text-slate-500 text-xs font-mono">{c.id}</span>
            </div>
          ),
          customer: c
        }));

      setOptions(filtered);
    } catch (e) {
      console.error("Search failed", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-[300px]">
      <AutoComplete
        options={options}
        onSelect={(value, option) => onSelect(option.customer)}
        onSearch={handleSearch}
        className="w-full"
      >
        <Input 
          prefix={<Search className="w-4 h-4 text-slate-500" />} 
          placeholder="Search subscriber..." 
          className="bg-slate-900 border-slate-700 text-slate-100 rounded-xl"
        />
      </AutoComplete>
    </div>
  );
};

export default GlobalSearchBar;
